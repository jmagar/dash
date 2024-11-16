package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"shh/agent/internal/agent"
	"shh/agent/internal/config"
	"shh/agent/internal/health"
	"shh/agent/internal/logger"
	"shh/agent/internal/metrics"
	"shh/agent/internal/process"
	"shh/agent/internal/websocket"
	"go.uber.org/zap"
)

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
	metricsCollector := metrics.NewCollector(cfg.Metrics.Interval, log)
	processManager := process.NewManager(cfg.Agent.MaxJobs, log)

	// Get system info for agent registration
	hostname, err := os.Hostname()
	if err != nil {
		log.Fatal("Failed to get hostname", zap.Error(err))
	}

	// Create agent info
	agentInfo := protocol.AgentInfo{
		ID:           cfg.Agent.ID,
		Hostname:     hostname,
		OSType:       runtime.GOOS,
		OSVersion:    "", // TODO: Get OS version
		AgentVersion: cfg.Agent.Version,
		Labels:       cfg.Agent.Labels,
		Capabilities: []string{"exec", "metrics", "health"},
	}

	// Initialize WebSocket client
	wsClient := websocket.NewClient(cfg.Server.URL, agentInfo, log)

	// Register command handler
	wsClient.RegisterHandler(protocol.TypeCommand, func(ctx context.Context, msg protocol.Message) error {
		var cmd protocol.CommandRequest
		if err := mapstructure.Decode(msg.Payload, &cmd); err != nil {
			return fmt.Errorf("invalid command request: %w", err)
		}

		// Execute command
		processID, err := processManager.Execute(ctx, cmd.Command, cmd.Args, cmd.Environment, cmd.WorkingDir)
		if err != nil {
			return fmt.Errorf("failed to execute command: %w", err)
		}

		// Send acknowledgment
		return wsClient.SendMessage(protocol.Message{
			Type:      protocol.TypeCommandResp,
			ID:        msg.ID,
			Timestamp: time.Now(),
			Payload: map[string]interface{}{
				"process_id": processID,
				"status":    "started",
			},
		})
	})

	// Register health checks
	healthChecker.AddCheck("websocket", wsClient.HealthCheck)
	healthChecker.AddCheck("process_manager", processManager.HealthCheck)
	healthChecker.AddCheck("metrics", metricsCollector.HealthCheck)

	// Start components
	components := []struct {
		name    string
		start   func(context.Context) error
		cleanup func(context.Context) error
	}{
		{"health", healthChecker.Start, healthChecker.Shutdown},
		{"metrics", metricsCollector.Start, metricsCollector.Shutdown},
		{"process", processManager.Start, processManager.Shutdown},
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
				heartbeat := protocol.HeartbeatInfo{
					AgentID:       cfg.Agent.ID,
					Timestamp:     time.Now(),
					LoadAverage:   metrics.LoadAverage,
					MemoryUsage:   float64(metrics.MemoryUsed) / float64(metrics.MemoryTotal),
					DiskUsage:     float64(metrics.DiskUsed) / float64(metrics.DiskTotal),
					CPUUsage:      metrics.CPUUsage,
					IsHealthy:     healthChecker.IsHealthy(),
					ActiveJobs:    len(processManager.GetProcesses()),
					UptimeSeconds: metrics.UptimeSeconds,
				}

				if err := wsClient.SendMessage(protocol.Message{
					Type:      protocol.TypeHeartbeat,
					ID:        fmt.Sprintf("heartbeat-%d", time.Now().Unix()),
					Timestamp: time.Now(),
					Payload:   heartbeat,
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
