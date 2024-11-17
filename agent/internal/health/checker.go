package health

import (
	"context"
	"fmt"
	"sync"
	"time"

	"go.uber.org/zap"
)

// Status represents the health status
type Status string

const (
	StatusHealthy   Status = "healthy"
	StatusUnhealthy Status = "unhealthy"
	StatusDegraded  Status = "degraded"
)

// CheckResult represents the result of a health check
type CheckResult struct {
	Status    Status
	Message   string
	Error     error
	Timestamp time.Time
	Duration  time.Duration
	Metadata  map[string]interface{}
}

// Check represents a health check function
type Check func(ctx context.Context) *CheckResult

// DependencyCheck represents a dependency health check
type DependencyCheck struct {
	Name        string
	Check       Check
	Required    bool
	Interval    time.Duration
	Timeout     time.Duration
	RetryCount  int
	RetryDelay  time.Duration
	LastResult  *CheckResult
	LastChecked time.Time
}

// CheckHistory stores historical health check results
type CheckHistory struct {
	Results     []*CheckResult
	MaxSize     int
	TotalChecks int64
	FailCount   int64
	mu          sync.RWMutex
}

// Checker manages health checks
type Checker struct {
	checks      map[string]*DependencyCheck
	history     map[string]*CheckHistory
	status      Status
	lastCheck   time.Time
	logger      *zap.Logger
	historySize int
	mu          sync.RWMutex
}

// NewChecker creates a new health checker
func NewChecker(logger *zap.Logger) *Checker {
	return &Checker{
		checks:      make(map[string]*DependencyCheck),
		history:     make(map[string]*CheckHistory),
		status:      StatusHealthy,
		logger:      logger,
		historySize: 100,
	}
}

// AddCheck registers a new health check
func (c *Checker) AddCheck(name string, check Check, opts ...CheckOption) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	depCheck := &DependencyCheck{
		Name:       name,
		Check:      check,
		Required:   true,
		Interval:   time.Minute,
		Timeout:    time.Second * 10,
		RetryCount: 3,
		RetryDelay: time.Second,
	}

	// Apply options
	for _, opt := range opts {
		opt(depCheck)
	}

	if _, exists := c.checks[name]; exists {
		return fmt.Errorf("check %s already exists", name)
	}

	c.checks[name] = depCheck
	c.history[name] = &CheckHistory{
		Results:  make([]*CheckResult, 0, c.historySize),
		MaxSize:  c.historySize,
	}

	return nil
}

// Start begins health checking
func (c *Checker) Start(ctx context.Context) error {
	for name, check := range c.checks {
		go c.runCheck(ctx, name, check)
	}
	return nil
}

// runCheck executes a health check periodically
func (c *Checker) runCheck(ctx context.Context, name string, check *DependencyCheck) {
	ticker := time.NewTicker(check.Interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			result := c.executeCheck(ctx, check)
			c.updateHistory(name, result)
			c.updateStatus()
		}
	}
}

// executeCheck runs a single health check with retries
func (c *Checker) executeCheck(ctx context.Context, check *DependencyCheck) *CheckResult {
	var result *CheckResult

	for i := 0; i <= check.RetryCount; i++ {
		checkCtx, cancel := context.WithTimeout(ctx, check.Timeout)
		start := time.Now()

		result = check.Check(checkCtx)
		result.Duration = time.Since(start)
		result.Timestamp = start

		cancel()

		if result.Status == StatusHealthy {
			break
		}

		if i < check.RetryCount {
			time.Sleep(check.RetryDelay)
		}
	}

	check.LastResult = result
	check.LastChecked = time.Now()

	return result
}

// updateHistory adds a check result to history
func (c *Checker) updateHistory(name string, result *CheckResult) {
	history := c.history[name]
	history.mu.Lock()
	defer history.mu.Unlock()

	history.Results = append(history.Results, result)
	history.TotalChecks++
	if result.Status != StatusHealthy {
		history.FailCount++
	}

	if len(history.Results) > history.MaxSize {
		history.Results = history.Results[1:]
	}
}

// updateStatus updates the overall health status
func (c *Checker) updateStatus() {
	c.mu.Lock()
	defer c.mu.Unlock()

	status := StatusHealthy
	for _, check := range c.checks {
		if check.LastResult == nil {
			continue
		}

		if check.Required && check.LastResult.Status == StatusUnhealthy {
			status = StatusUnhealthy
			break
		}

		if check.LastResult.Status == StatusDegraded {
			status = StatusDegraded
		}
	}

	c.status = status
	c.lastCheck = time.Now()
}

// GetStatus returns the current health status
func (c *Checker) GetStatus() Status {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.status
}

// GetCheckResults returns all check results
func (c *Checker) GetCheckResults() map[string]*CheckResult {
	c.mu.RLock()
	defer c.mu.RUnlock()

	results := make(map[string]*CheckResult)
	for name, check := range c.checks {
		results[name] = check.LastResult
	}
	return results
}

// GetCheckHistory returns the history for a specific check
func (c *Checker) GetCheckHistory(name string) ([]*CheckResult, error) {
	history, ok := c.history[name]
	if !ok {
		return nil, fmt.Errorf("no history for check %s", name)
	}

	history.mu.RLock()
	defer history.mu.RUnlock()

	results := make([]*CheckResult, len(history.Results))
	copy(results, history.Results)
	return results, nil
}

// RemoveCheck removes a health check
func (c *Checker) RemoveCheck(name string) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if _, exists := c.checks[name]; !exists {
		return fmt.Errorf("check %s does not exist", name)
	}

	delete(c.checks, name)
	delete(c.history, name)
	return nil
}

// CheckOption configures a dependency check
type CheckOption func(*DependencyCheck)

// WithRequired sets whether the check is required
func WithRequired(required bool) CheckOption {
	return func(c *DependencyCheck) {
		c.Required = required
	}
}

// WithInterval sets the check interval
func WithInterval(interval time.Duration) CheckOption {
	return func(c *DependencyCheck) {
		c.Interval = interval
	}
}

// WithTimeout sets the check timeout
func WithTimeout(timeout time.Duration) CheckOption {
	return func(c *DependencyCheck) {
		c.Timeout = timeout
	}
}

// WithRetries sets retry parameters
func WithRetries(count int, delay time.Duration) CheckOption {
	return func(c *DependencyCheck) {
		c.RetryCount = count
		c.RetryDelay = delay
	}
}

// Shutdown stops the health checker
func (c *Checker) Shutdown(ctx context.Context) error {
	// Context is used by the caller to cancel shutdown
	return nil
}
