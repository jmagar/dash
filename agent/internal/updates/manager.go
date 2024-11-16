package updates

import (
	"context"
	"fmt"
	"os/exec"
	"strings"
	"sync"
	"time"

	"go.uber.org/zap"
)

// PackageType represents a package type
type PackageType string

const (
	TypeSystem PackageType = "system"
	TypeUser   PackageType = "user"
	TypeDeb    PackageType = "deb"
	TypeRPM    PackageType = "rpm"
	TypeBrew   PackageType = "brew"
)

// Package represents a software package
type Package struct {
	Name         string      `json:"name"`
	Type         PackageType `json:"type"`
	Version      string      `json:"version"`
	NewVersion   string      `json:"new_version,omitempty"`
	Description  string      `json:"description"`
	Dependencies []string    `json:"dependencies"`
	Size        int64       `json:"size"`
	InstallDate time.Time   `json:"install_date"`
}

// Update represents a package update
type Update struct {
	ID          string      `json:"id"`
	Package     string      `json:"package"`
	Type        PackageType `json:"type"`
	FromVersion string      `json:"from_version"`
	ToVersion   string      `json:"to_version"`
	Status      string      `json:"status"`
	Error       string      `json:"error,omitempty"`
	StartTime   time.Time   `json:"start_time"`
	EndTime     time.Time   `json:"end_time,omitempty"`
}

// Manager manages software updates
type Manager struct {
	logger       *zap.Logger
	packages     map[string]*Package
	updates      map[string]*Update
	packageMgr   string
	mu           sync.RWMutex
}

// NewManager creates a new update manager
func NewManager(logger *zap.Logger) *Manager {
	return &Manager{
		logger:     logger,
		packages:   make(map[string]*Package),
		updates:    make(map[string]*Update),
		packageMgr: detectPackageManager(),
	}
}

// detectPackageManager detects the system package manager
func detectPackageManager() string {
	// Try apt-get
	if _, err := exec.LookPath("apt-get"); err == nil {
		return "apt"
	}

	// Try yum
	if _, err := exec.LookPath("yum"); err == nil {
		return "yum"
	}

	// Try dnf
	if _, err := exec.LookPath("dnf"); err == nil {
		return "dnf"
	}

	// Try brew
	if _, err := exec.LookPath("brew"); err == nil {
		return "brew"
	}

	return ""
}

// CheckUpdates checks for available updates
func (m *Manager) CheckUpdates(ctx context.Context) error {
	switch m.packageMgr {
	case "apt":
		return m.checkAptUpdates(ctx)
	case "yum", "dnf":
		return m.checkYumUpdates(ctx)
	case "brew":
		return m.checkBrewUpdates(ctx)
	default:
		return fmt.Errorf("unsupported package manager")
	}
}

// checkAptUpdates checks for apt updates
func (m *Manager) checkAptUpdates(ctx context.Context) error {
	// Update package lists
	cmd := exec.CommandContext(ctx, "apt-get", "update")
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to update package lists: %w", err)
	}

	// Check for upgradable packages
	cmd = exec.CommandContext(ctx, "apt-get", "-s", "upgrade")
	output, err := cmd.Output()
	if err != nil {
		return fmt.Errorf("failed to check updates: %w", err)
	}

	// Parse output
	for _, line := range strings.Split(string(output), "\n") {
		if strings.HasPrefix(line, "Inst") {
			parts := strings.Fields(line)
			if len(parts) >= 4 {
				pkg := parts[1]
				fromVersion := parts[2]
				toVersion := parts[3]

				update := &Update{
					ID:          fmt.Sprintf("upd_%d", time.Now().UnixNano()),
					Package:     pkg,
					Type:        TypeDeb,
					FromVersion: fromVersion,
					ToVersion:   toVersion,
					Status:      "pending",
					StartTime:   time.Now(),
				}

				m.mu.Lock()
				m.updates[update.ID] = update
				m.mu.Unlock()
			}
		}
	}

	return nil
}

// checkYumUpdates checks for yum/dnf updates
func (m *Manager) checkYumUpdates(ctx context.Context) error {
	cmd := exec.CommandContext(ctx, m.packageMgr, "check-update")
	output, err := cmd.Output()

	// Exit code 100 means updates are available
	if err != nil && cmd.ProcessState.ExitCode() != 100 {
		return fmt.Errorf("failed to check updates: %w", err)
	}

	// Parse output
	for _, line := range strings.Split(string(output), "\n") {
		parts := strings.Fields(line)
		if len(parts) >= 2 {
			pkg := parts[0]
			newVersion := parts[1]

			// Get current version
			cmd := exec.CommandContext(ctx, "rpm", "-q", pkg)
			curr, err := cmd.Output()
			if err != nil {
				continue
			}

			update := &Update{
				ID:          fmt.Sprintf("upd_%d", time.Now().UnixNano()),
				Package:     pkg,
				Type:        TypeRPM,
				FromVersion: strings.TrimSpace(string(curr)),
				ToVersion:   newVersion,
				Status:      "pending",
				StartTime:   time.Now(),
			}

			m.mu.Lock()
			m.updates[update.ID] = update
			m.mu.Unlock()
		}
	}

	return nil
}

// checkBrewUpdates checks for Homebrew updates
func (m *Manager) checkBrewUpdates(ctx context.Context) error {
	// Update Homebrew itself
	cmd := exec.CommandContext(ctx, "brew", "update")
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to update Homebrew: %w", err)
	}

	// Check for outdated packages
	cmd = exec.CommandContext(ctx, "brew", "outdated")
	output, err := cmd.Output()
	if err != nil {
		return fmt.Errorf("failed to check updates: %w", err)
	}

	// Parse output
	for _, line := range strings.Split(string(output), "\n") {
		parts := strings.Fields(line)
		if len(parts) >= 3 {
			pkg := parts[0]
			fromVersion := parts[1]
			toVersion := parts[2]

			update := &Update{
				ID:          fmt.Sprintf("upd_%d", time.Now().UnixNano()),
				Package:     pkg,
				Type:        TypeBrew,
				FromVersion: fromVersion,
				ToVersion:   toVersion,
				Status:      "pending",
				StartTime:   time.Now(),
			}

			m.mu.Lock()
			m.updates[update.ID] = update
			m.mu.Unlock()
		}
	}

	return nil
}

// ApplyUpdates applies pending updates
func (m *Manager) ApplyUpdates(ctx context.Context, updateIDs []string) error {
	switch m.packageMgr {
	case "apt":
		return m.applyAptUpdates(ctx, updateIDs)
	case "yum", "dnf":
		return m.applyYumUpdates(ctx, updateIDs)
	case "brew":
		return m.applyBrewUpdates(ctx, updateIDs)
	default:
		return fmt.Errorf("unsupported package manager")
	}
}

// applyAptUpdates applies apt updates
func (m *Manager) applyAptUpdates(ctx context.Context, updateIDs []string) error {
	for _, id := range updateIDs {
		m.mu.RLock()
		update, ok := m.updates[id]
		m.mu.RUnlock()
		if !ok {
			continue
		}

		update.Status = "updating"

		cmd := exec.CommandContext(ctx, "apt-get", "install", "-y", update.Package)
		if err := cmd.Run(); err != nil {
			update.Status = "failed"
			update.Error = err.Error()
			update.EndTime = time.Now()
			continue
		}

		update.Status = "completed"
		update.EndTime = time.Now()
	}

	return nil
}

// applyYumUpdates applies yum/dnf updates
func (m *Manager) applyYumUpdates(ctx context.Context, updateIDs []string) error {
	for _, id := range updateIDs {
		m.mu.RLock()
		update, ok := m.updates[id]
		m.mu.RUnlock()
		if !ok {
			continue
		}

		update.Status = "updating"

		cmd := exec.CommandContext(ctx, m.packageMgr, "update", "-y", update.Package)
		if err := cmd.Run(); err != nil {
			update.Status = "failed"
			update.Error = err.Error()
			update.EndTime = time.Now()
			continue
		}

		update.Status = "completed"
		update.EndTime = time.Now()
	}

	return nil
}

// applyBrewUpdates applies Homebrew updates
func (m *Manager) applyBrewUpdates(ctx context.Context, updateIDs []string) error {
	for _, id := range updateIDs {
		m.mu.RLock()
		update, ok := m.updates[id]
		m.mu.RUnlock()
		if !ok {
			continue
		}

		update.Status = "updating"

		cmd := exec.CommandContext(ctx, "brew", "upgrade", update.Package)
		if err := cmd.Run(); err != nil {
			update.Status = "failed"
			update.Error = err.Error()
			update.EndTime = time.Now()
			continue
		}

		update.Status = "completed"
		update.EndTime = time.Now()
	}

	return nil
}

// GetUpdates returns all updates
func (m *Manager) GetUpdates() []Update {
	m.mu.RLock()
	defer m.mu.RUnlock()

	updates := make([]Update, 0, len(m.updates))
	for _, update := range m.updates {
		updates = append(updates, *update)
	}
	return updates
}

// GetUpdate returns a specific update
func (m *Manager) GetUpdate(id string) (*Update, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	update, ok := m.updates[id]
	return update, ok
}

// ClearCompleted clears completed updates
func (m *Manager) ClearCompleted() {
	m.mu.Lock()
	defer m.mu.Unlock()

	for id, update := range m.updates {
		if update.Status == "completed" {
			delete(m.updates, id)
		}
	}
}

// HealthCheck implements the health.Checker interface
func (m *Manager) HealthCheck(ctx context.Context) error {
	if m.packageMgr == "" {
		return fmt.Errorf("no package manager detected")
	}
	return nil
}
