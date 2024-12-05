package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"runtime"
	"sync"
	"time"

	"go.uber.org/zap"

	"shh/agent/internal/health"
	"shh/agent/internal/metrics"
	"shh/agent/internal/process"
	"shh/agent/internal/protocol"
	"shh/agent/internal/websocket"

	// Add Prometheus library for performance monitoring
	"github.com/prometheus/client_golang/prometheus"
	"github.com/fsnotify/fsnotify"
)

type Agent struct {
	config   *Config
	logger   *zap.Logger
	health   *health.Checker
	metrics  *metrics.Collector
	ws       *websocket.Client
	process  *process.Manager
	stopOnce sync.Once
	done     chan struct{}
	plugins  []plugins.Plugin
}

type Config struct {
	ServerURL string
	AgentID   string
	Version   string
	Labels    map[string]string
}

func New(config *Config, logger *zap.Logger) (*Agent, error) {
	if config.ServerURL == "" {
		return nil, fmt.Errorf("server URL is required")
	}

	// Get system info for agent registration
	hostname, err := os.Hostname()
	if err != nil {
		return nil, fmt.Errorf("failed to get hostname: %w", err)
	}

	// Create agent info
	agentInfo := protocol.AgentInfo{
		ID:       config.AgentID,
		Version:  config.Version,
		Hostname: hostname,
		Platform: runtime.GOOS,
		OS:       runtime.GOOS,
		Arch:     runtime.GOARCH,
		Labels:   config.Labels,
		Features: []string{
			"exec",
			"metrics",
			"health",
		},
	}

	healthChecker := health.NewChecker(logger)
	metricsCollector := metrics.NewCollector(logger)
	wsClient := websocket.NewClient(config.ServerURL, agentInfo, logger)
	processManager := process.NewManager(logger)

	// Register performance metrics with Prometheus
	yourMetrics := prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "agent_requests_total",
			Help: "Total number of requests handled by the agent",
		},
		[]string{"method"},
	)
	prometheus.Register(yourMetrics)

	a := &Agent{
		config:   config,
		logger:   logger,
		health:   healthChecker,
		metrics:  metricsCollector,
		ws:       wsClient,
		process:  processManager,
		done:     make(chan struct{}),
		plugins:  make([]plugins.Plugin, 0),
	}

	a.InitPlugins()

	return a, nil
}

func (a *Agent) InitPlugins() {
	// Get SSH key plugin configuration from config manager
	sshConfig := a.config.GetPluginConfig("sshkey")
	if sshConfig == nil {
		a.logger.Warn("SSH key plugin configuration not found, using defaults")
		sshConfig = map[string]interface{}{
			"host_url": a.config.ServerURL,
		}
	}

	sshKeyPlugin := &plugins.SSHKeyPlugin{
		HostURL: sshConfig["host_url"].(string),
		AgentID: a.config.AgentID,
		Agents:  []string{}, // Will be populated dynamically
	}

	a.plugins = append(a.plugins, sshKeyPlugin)

	// Start plugins with proper error handling
	for _, plugin := range a.plugins {
		go func(p plugins.Plugin) {
			defer func() {
				if r := recover(); r != nil {
					a.logger.Error("Plugin panic",
						zap.String("plugin", p.Name()),
						zap.Any("error", r))
				}
			}()
			
			a.logger.Info("Starting plugin", zap.String("plugin", p.Name()))
			p.Start()
		}(plugin)
	}
}

func (a *Agent) Start(ctx context.Context) error {
	// Register health checks
	a.health.AddCheck("websocket", wrapHealthCheck(a.ws.HealthCheck))
	a.health.AddCheck("process", wrapHealthCheck(a.process.HealthCheck))
	a.health.AddCheck("metrics", wrapHealthCheck(a.metrics.HealthCheck))
	a.health.AddCheck("database", wrapHealthCheck(a.checkDatabase))
	a.health.AddCheck("resources", wrapHealthCheck(a.checkResources))

	// Start components
	components := []struct {
		name    string
		start   func(context.Context) error
		cleanup func(context.Context) error
	}{
		{"health", a.health.Start, a.health.Shutdown},
		{"metrics", a.metrics.Start, a.metrics.Shutdown},
		{"process", a.process.Start, a.process.Shutdown},
		{"websocket", a.ws.Connect, a.ws.Close},
	}

	// Start all components
	for _, c := range components {
		a.logger.Info("Starting component", zap.String("component", c.name))
		if err := c.start(ctx); err != nil {
			return fmt.Errorf("failed to start %s: %w", c.name, err)
		}
	}

	// Register command handler
	a.ws.RegisterHandler(protocol.TypeCommand, a.handleCommand)

	// Start dynamic config reload
	go a.DynamicConfigReload(ctx, "path/to/config/file")

	return nil
}

func (a *Agent) Stop(ctx context.Context) error {
	var stopErr error
	a.stopOnce.Do(func() {
		defer close(a.done)

		// Stop components in reverse order
		components := []struct {
			name    string
			cleanup func(context.Context) error
		}{
			{"websocket", a.ws.Close},
			{"process", a.process.Shutdown},
			{"metrics", a.metrics.Shutdown},
			{"health", a.health.Shutdown},
		}

		for _, c := range components {
			a.logger.Info("Stopping component", zap.String("component", c.name))
			if err := c.cleanup(ctx); err != nil {
				stopErr = fmt.Errorf("failed to stop %s: %w", c.name, err)
				return
			}
		}
	})

	return stopErr
}

func (a *Agent) Shutdown(ctx context.Context) error {
	// Perform any necessary cleanup operations
	if err := a.process.Shutdown(ctx); err != nil {
		return fmt.Errorf("failed to shutdown process manager: %w", err)
	}
	if err := a.ws.Shutdown(); err != nil {
		return fmt.Errorf("failed to shutdown websocket: %w", err)
	}
	return nil
}

func (a *Agent) handleCommand(ctx context.Context, msg protocol.Message) error {
	var cmd protocol.AgentCommand
	if err := json.Unmarshal(msg.Payload, &cmd); err != nil {
		return fmt.Errorf("invalid command payload: %w", err)
	}

	result, err := a.process.Execute(ctx, cmd.Command, cmd.Args)
	if err != nil {
		return fmt.Errorf("failed to execute command %s: %w", cmd.Command, err)
	}

	response := protocol.ResultPayload{
		CommandID: msg.ID,
		ExitCode:  result.ExitCode,
		Stdout:    result.Stdout,
		Stderr:    result.Stderr,
	}

	responseBytes, err := json.Marshal(response)
	if err != nil {
		return fmt.Errorf("failed to marshal response for command %s: %w", cmd.Command, err)
	}

	// Increment Prometheus counter for handled requests
	yourMetrics.With(prometheus.Labels{"method": cmd.Command}).Inc()

	return a.ws.SendMessage(protocol.Message{
		Type:      protocol.TypeResult,
		ID:        msg.ID,
		Timestamp: time.Now(),
		Payload:   responseBytes,
	})
}

func (a *Agent) checkDatabase(ctx context.Context) error {
	// Add database connectivity check
	// Replace with actual database connection logic
	return nil
}

func (a *Agent) checkResources(ctx context.Context) error {
	// Add resource usage check (e.g., CPU, memory, disk space)
	// Replace with actual resource usage logic
	return nil
}

// wrapHealthCheck converts a context-aware health check function to the health.Check interface
func wrapHealthCheck(check func(context.Context) error) health.Check {
	return func(ctx context.Context) *health.CheckResult {
		start := time.Now()
		err := check(ctx)
		duration := time.Since(start)

		result := &health.CheckResult{
			Status:    health.StatusHealthy,
			Timestamp: start,
			Duration:  duration,
		}

		if err != nil {
			result.Status = health.StatusUnhealthy
			result.Error = err
			result.Message = err.Error()
		}

		return result
	}
}

func (a *Agent) DynamicConfigReload(ctx context.Context, path string) {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		a.logger.Error("Failed to create watcher", zap.Error(err))
		return
	}
	defer watcher.Close()

	if err := watcher.Add(path); err != nil {
		a.logger.Error("Failed to add watcher for config file", zap.String("path", path), zap.Error(err))
		return
	}

	for {
		select {
		case <-ctx.Done():
			return
		case event := <-watcher.Events:
			if event.Op&fsnotify.Write == fsnotify.Write {
				a.logger.Info("Config file changed, reloading...")
				if err := a.ReloadConfig(path); err != nil {
					a.logger.Error("Failed to reload config", zap.Error(err))
				}
			}
		case err := <-watcher.Errors:
			a.logger.Error("Watcher error", zap.Error(err))
		}
	}
}

func (a *Agent) ReloadConfig(path string) error {
	// Reload config logic goes here
	return nil
}
