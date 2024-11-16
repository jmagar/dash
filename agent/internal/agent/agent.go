package agent

import (
	"context"
	"fmt"
	"sync"
	"time"

	"shh/agent/internal/config"
	"shh/agent/internal/health"
	"shh/agent/internal/metrics"
	"shh/agent/internal/process"
	"shh/agent/internal/websocket"
	"golang.org/x/sync/errgroup"
)

// Agent represents the main agent process
type Agent struct {
	cfg      *config.Config
	ctx      context.Context
	cancel   context.CancelFunc
	wg       sync.WaitGroup
	health   *health.Checker
	metrics  *metrics.Collector
	ws       *websocket.Client
	proc     *process.Manager
	plugins  []Plugin
	stopOnce sync.Once
}

// New creates a new agent instance
func New(ctx context.Context, cfg *config.Config) (*Agent, error) {
	ctx, cancel := context.WithCancel(ctx)

	health := health.NewChecker()
	metrics := metrics.NewCollector()
	ws := websocket.NewClient(cfg.Server.URL)
	proc := process.NewManager()

	agent := &Agent{
		cfg:     cfg,
		ctx:     ctx,
		cancel:  cancel,
		health:  health,
		metrics: metrics,
		ws:      ws,
		proc:    proc,
	}

	// Register health checks
	health.AddCheck("websocket", ws.HealthCheck)
	health.AddCheck("process_manager", proc.HealthCheck)

	return agent, nil
}

// Start begins all agent processes
func (a *Agent) Start() error {
	g, ctx := errgroup.WithContext(a.ctx)

	// Start WebSocket connection
	g.Go(func() error {
		return a.ws.Connect(ctx)
	})

	// Start metrics collection
	g.Go(func() error {
		return a.metrics.Start(ctx)
	})

	// Start process manager
	g.Go(func() error {
		return a.proc.Start(ctx)
	})

	// Start health checker
	g.Go(func() error {
		return a.health.Start(ctx)
	})

	// Start plugins
	for _, p := range a.plugins {
		plugin := p // Create new variable for goroutine
		g.Go(func() error {
			return plugin.Start(ctx)
		})
	}

	// Monitor for errors
	go func() {
		if err := g.Wait(); err != nil {
			fmt.Printf("Agent error: %v\n", err)
			a.Shutdown(context.Background())
		}
	}()

	return nil
}

// Shutdown gracefully stops the agent
func (a *Agent) Shutdown(ctx context.Context) error {
	var shutdownErr error
	a.stopOnce.Do(func() {
		// Cancel context to signal shutdown
		a.cancel()

		// Create error group for shutdown
		g, ctx := errgroup.WithContext(ctx)

		// Shutdown plugins in reverse order
		for i := len(a.plugins) - 1; i >= 0; i-- {
			plugin := a.plugins[i]
			g.Go(func() error {
				return plugin.Shutdown(ctx)
			})
		}

		// Shutdown core components
		g.Go(func() error {
			return a.ws.Shutdown(ctx)
		})
		g.Go(func() error {
			return a.metrics.Shutdown(ctx)
		})
		g.Go(func() error {
			return a.proc.Shutdown(ctx)
		})
		g.Go(func() error {
			return a.health.Shutdown(ctx)
		})

		// Wait for all shutdowns to complete
		shutdownErr = g.Wait()
	})

	return shutdownErr
}

// Plugin interface for extensibility
type Plugin interface {
	Name() string
	Start(context.Context) error
	Shutdown(context.Context) error
}

// RegisterPlugin adds a new plugin to the agent
func (a *Agent) RegisterPlugin(p Plugin) {
	a.plugins = append(a.plugins, p)
	a.health.AddCheck(p.Name(), func(ctx context.Context) error {
		// Add basic plugin health check
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
			return nil
		}
	})
}
