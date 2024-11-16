package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/signal"
	"runtime"
	"syscall"
	"time"

	"shh/agent/internal/config"
	"shh/agent/internal/docker"
	"shh/agent/internal/health"
	"shh/agent/internal/logger"
	"shh/agent/internal/metrics"
	"shh/agent/internal/process"
	"shh/agent/internal/protocol"
	"shh/agent/internal/websocket"

	"go.uber.org/zap"
)

// wrapHealthCheck converts a simple health check function to the health.Check interface
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

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to load configuration: %v\n", err)
		os.Exit(1)
	}

	// Initialize logger
	log, err := logger.Setup(&cfg.Logging)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to setup logger: %v\n", err)
		os.Exit(1)
	}
	defer logger.Sync(log)

	// Create root context
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Initialize components
	healthChecker := health.NewChecker(log)
	metricsCollector := metrics.NewCollector(log)
	processManager := process.NewManager(log)

	// Initialize Docker plugin
	dockerManager, err := docker.NewManager(log)
	if err != nil {
		log.Fatal("Failed to create Docker manager", zap.Error(err))
	}

	// Create events channel for Docker plugin
	dockerEvents := make(chan interface{}, 100)
	dockerPlugin, err := docker.NewPlugin(log, dockerEvents)
	if err != nil {
		log.Fatal("Failed to create Docker plugin", zap.Error(err))
	}

	// Get system info for agent registration
	hostname, err := os.Hostname()
	if err != nil {
		log.Fatal("Failed to get hostname", zap.Error(err))
	}

	// Create agent info
	agentInfo := protocol.AgentInfo{
		ID:       cfg.Agent.ID,
		Version:  cfg.Agent.Version,
		Hostname: hostname,
		Platform: runtime.GOOS,
		OS:       runtime.GOOS,
		Arch:     runtime.GOARCH,
		Labels:   cfg.Agent.Labels,
		Features: []string{
			"exec",
			"metrics",
			"health",
			"docker",
			"docker:compose",
			"docker:logs",
		},
	}

	// Initialize WebSocket client
	wsClient := websocket.NewClient(cfg.Server.URL, agentInfo, log)

	// Create handler wrapper for Docker plugin
	dockerHandler := func(ctx context.Context, msg protocol.Message) error {
		var cmd protocol.AgentCommand
		if err := json.Unmarshal(msg.Payload, &cmd); err != nil {
			return fmt.Errorf("invalid command payload: %w", err)
		}

		result, err := dockerPlugin.HandleCommand(ctx, cmd.Command, cmd.Args)
		if err != nil {
			return err
		}

		resultJSON, err := json.Marshal(map[string]interface{}{
			"result": result,
		})
		if err != nil {
			return fmt.Errorf("failed to marshal result: %w", err)
		}

		return wsClient.SendMessage(protocol.Message{
			Type:      protocol.TypeResult,
			ID:        msg.ID,
			Timestamp: time.Now(),
			Payload:   resultJSON,
		})
	}

	// Register command handlers
	wsClient.RegisterHandler(protocol.TypeCommand, dockerHandler)

	// Register health checks
	healthChecker.AddCheck("websocket", wrapHealthCheck(wsClient.HealthCheck))
	healthChecker.AddCheck("process_manager", wrapHealthCheck(processManager.HealthCheck))
	healthChecker.AddCheck("metrics", wrapHealthCheck(metricsCollector.HealthCheck))
	healthChecker.AddCheck("docker", wrapHealthCheck(dockerManager.HealthCheck))

	// Start components
	components := []struct {
		name    string
		start   func(context.Context) error
		cleanup func(context.Context) error
	}{
		{"health", healthChecker.Start, healthChecker.Shutdown},
		{"metrics", metricsCollector.Start, metricsCollector.Shutdown},
		{"process", processManager.Start, processManager.Shutdown},
		{"docker", dockerPlugin.Start, dockerPlugin.Shutdown},
		{"websocket", wsClient.Connect, wsClient.Shutdown},
	}

	// Start all components
	for _, c := range components {
		log.Info("Starting component", zap.String("component", c.name))
		if err := c.start(ctx); err != nil {
			log.Fatal("Failed to start component",
				zap.String("component", c.name),
				zap.Error(err))
		}
	}

	// Forward Docker events to WebSocket
	go func() {
		for event := range dockerEvents {
			eventJSON, err := json.Marshal(map[string]interface{}{
				"event": event,
			})
			if err != nil {
				log.Error("Failed to marshal Docker event", zap.Error(err))
				continue
			}

			if err := wsClient.SendMessage(protocol.Message{
				Type:      protocol.TypeResult,
				ID:        fmt.Sprintf("docker-event-%d", time.Now().UnixNano()),
				Timestamp: time.Now(),
				Payload:   eventJSON,
			}); err != nil {
				log.Error("Failed to send Docker event", zap.Error(err))
			}
		}
	}()

	// Start heartbeat sender
	go func() {
		ticker := time.NewTicker(15 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				metrics := metricsCollector.GetMetrics()
				processes, _ := processManager.GetProcesses()

				heartbeat := protocol.AgentHeartbeat{
					Status:    string(healthChecker.GetStatus()),
					Uptime:    metrics.UptimeSeconds,
					LoadAvg:   [3]float64(metrics.LoadAverage),
					Processes: len(processes),
					Metrics: protocol.AgentMetrics{
						CPU:    metrics.CPUUsage,
						Memory: float64(metrics.MemoryUsed) / float64(metrics.MemoryTotal),
						Disk:   float64(metrics.DiskUsed) / float64(metrics.DiskTotal),
					},
				}

				heartbeatJSON, err := json.Marshal(heartbeat)
				if err != nil {
					log.Error("Failed to marshal heartbeat", zap.Error(err))
					continue
				}

				if err := wsClient.SendMessage(protocol.Message{
					Type:      protocol.TypeHeartbeat,
					ID:        fmt.Sprintf("heartbeat-%d", time.Now().Unix()),
					Timestamp: time.Now(),
					Payload:   heartbeatJSON,
				}); err != nil {
					log.Error("Failed to send heartbeat", zap.Error(err))
				}
			}
		}
	}()

	// Handle shutdown signals
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Wait for shutdown signal
	<-sigChan
	log.Info("Received shutdown signal")

	// Create shutdown context with timeout
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), cfg.Agent.ShutdownWait)
	defer shutdownCancel()

	// Close Docker events channel
	close(dockerEvents)

	// Shutdown components in reverse order
	for i := len(components) - 1; i >= 0; i-- {
		c := components[i]
		log.Info("Stopping component", zap.String("component", c.name))
		if err := c.cleanup(shutdownCtx); err != nil {
			log.Error("Failed to stop component",
				zap.String("component", c.name),
				zap.Error(err))
		}
	}

	log.Info("Agent shutdown complete")
}
