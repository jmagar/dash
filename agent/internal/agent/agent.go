package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"go.uber.org/zap"

	"shh/agent/internal/health"
	"shh/agent/internal/metrics"
	"shh/agent/internal/process"
	"shh/agent/internal/protocol"
	"shh/agent/internal/websocket"
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
}

type Config struct {
	ServerURL string
	AgentID   string
	Labels    map[string]string
}

func New(config *Config, logger *zap.Logger) (*Agent, error) {
	if config.ServerURL == "" {
		return nil, fmt.Errorf("server URL is required")
	}

	healthChecker := health.NewChecker(logger)
	metricsCollector := metrics.NewCollector(logger)
	wsClient := websocket.NewClient(config.ServerURL, logger)
	processManager := process.NewManager(logger)

	return &Agent{
		config:   config,
		logger:   logger,
		health:   healthChecker,
		metrics:  metricsCollector,
		ws:       wsClient,
		process:  processManager,
		done:     make(chan struct{}),
	}, nil
}

func (a *Agent) Start(ctx context.Context) error {
	// Register health checks
	a.health.AddCheck("websocket", wrapHealthCheck(a.ws.HealthCheck))
	a.health.AddCheck("process", wrapHealthCheck(a.process.HealthCheck))
	a.health.AddCheck("metrics", wrapHealthCheck(a.metrics.HealthCheck))

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

func (a *Agent) handleCommand(ctx context.Context, msg protocol.Message) error {
	var cmd protocol.AgentCommand
	if err := json.Unmarshal(msg.Payload, &cmd); err != nil {
		return fmt.Errorf("invalid command payload: %w", err)
	}

	result, err := a.process.Execute(ctx, cmd.Command, cmd.Args)
	if err != nil {
		return err
	}

	response := protocol.ResultPayload{
		CommandID: msg.ID,
		ExitCode:  result.ExitCode,
		Stdout:    result.Stdout,
		Stderr:    result.Stderr,
	}

	responseBytes, err := json.Marshal(response)
	if err != nil {
		return fmt.Errorf("failed to marshal response: %w", err)
	}

	return a.ws.SendMessage(protocol.Message{
		Type:      protocol.TypeResult,
		ID:        msg.ID,
		Timestamp: time.Now(),
		Payload:   responseBytes,
	})
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
