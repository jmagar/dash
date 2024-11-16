package docker

import (
	"context"
	"fmt"
	"time"

	"go.uber.org/zap"
)

// Plugin implements the agent.Plugin interface for Docker operations
type Plugin struct {
	manager *Manager
	logger  *zap.Logger
	events  chan<- interface{} // Channel for sending events to agent
}

// NewPlugin creates a new Docker plugin
func NewPlugin(logger *zap.Logger, events chan<- interface{}) (*Plugin, error) {
	manager, err := NewManager(logger)
	if err != nil {
		return nil, fmt.Errorf("failed to create Docker manager: %w", err)
	}

	return &Plugin{
		manager: manager,
		logger:  logger,
		events:  events,
	}, nil
}

// Name returns the plugin name
func (p *Plugin) Name() string {
	return "docker"
}

// Start begins Docker monitoring
func (p *Plugin) Start(ctx context.Context) error {
	// Start stats collection
	go p.collectStats(ctx)
	return nil
}

// Shutdown stops the plugin
func (p *Plugin) Shutdown(ctx context.Context) error {
	return p.manager.Shutdown(ctx)
}

// HandleCommand processes Docker-related commands
func (p *Plugin) HandleCommand(ctx context.Context, cmd string, args []string) (interface{}, error) {
	switch cmd {
	case "docker:stats":
		return p.handleStats(ctx)
	case "docker:containers":
		return p.handleListContainers(ctx)
	case "docker:container:start":
		if len(args) < 1 {
			return nil, fmt.Errorf("container ID required")
		}
		return nil, p.manager.StartContainer(ctx, args[0])
	case "docker:container:stop":
		if len(args) < 1 {
			return nil, fmt.Errorf("container ID required")
		}
		return nil, p.manager.StopContainer(ctx, args[0], nil)
	case "docker:container:restart":
		if len(args) < 1 {
			return nil, fmt.Errorf("container ID required")
		}
		return nil, p.manager.RestartContainer(ctx, args[0], nil)
	case "docker:container:logs":
		if len(args) < 1 {
			return nil, fmt.Errorf("container ID required")
		}
		tail := 100 // Default to last 100 lines
		if len(args) > 1 {
			fmt.Sscanf(args[1], "%d", &tail)
		}
		return p.manager.GetContainerLogs(ctx, args[0], tail)
	default:
		return nil, fmt.Errorf("unknown Docker command: %s", cmd)
	}
}

// handleStats returns current Docker stats
func (p *Plugin) handleStats(ctx context.Context) (interface{}, error) {
	containers, err := p.manager.ListContainers(ctx, false)
	if err != nil {
		return nil, err
	}

	var totalCPU float64
	var totalMemory float64
	var totalDisk float64

	for _, c := range containers {
		stats, err := p.manager.GetContainerStats(ctx, c.ID)
		if err != nil {
			p.logger.Warn("Failed to get container stats",
				zap.String("container", c.ID),
				zap.Error(err))
			continue
		}

		// Calculate CPU percentage
		cpuDelta := float64(stats.CPUStats.CPUUsage.TotalUsage - stats.PreCPUStats.CPUUsage.TotalUsage)
		systemDelta := float64(stats.CPUStats.SystemUsage - stats.PreCPUStats.SystemUsage)
		cpuPercent := (cpuDelta / systemDelta) * float64(len(stats.CPUStats.CPUUsage.PercpuUsage)) * 100.0
		totalCPU += cpuPercent

		// Calculate memory percentage
		memoryPercent := (float64(stats.MemoryStats.Usage) / float64(stats.MemoryStats.Limit)) * 100.0
		totalMemory += memoryPercent
	}

	// Get disk usage (simplified)
	totalDisk = 0 // TODO: Implement disk usage calculation

	stats := map[string]interface{}{
		"containers":   len(containers),
		"cpuUsage":    fmt.Sprintf("%.2f%%", totalCPU),
		"memoryUsage": fmt.Sprintf("%.2f%%", totalMemory),
		"diskUsage":   fmt.Sprintf("%.2f%%", totalDisk),
	}

	// Send stats through event channel
	if p.events != nil {
		select {
		case p.events <- map[string]interface{}{
			"type":  "docker:stats",
			"stats": stats,
		}:
		default:
			p.logger.Warn("Failed to send Docker stats event: channel full")
		}
	}

	return stats, nil
}

// handleListContainers returns list of containers
func (p *Plugin) handleListContainers(ctx context.Context) (interface{}, error) {
	return p.manager.ListContainers(ctx, true)
}

// collectStats periodically collects Docker stats
func (p *Plugin) collectStats(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			stats, err := p.handleStats(ctx)
			if err != nil {
				p.logger.Error("Failed to collect Docker stats",
					zap.Error(err))
				continue
			}

			// Stats are sent through event channel in handleStats
			p.logger.Debug("Docker stats collected",
				zap.Any("stats", stats))
		}
	}
}
