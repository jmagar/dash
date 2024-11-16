package packages

import (
	"context"
	"fmt"
	"os/exec"
	"runtime"
	"strings"

	"go.uber.org/zap"
)

// PackageManager represents a system package manager
type PackageManager interface {
	Install(ctx context.Context, pkg string) error
	Remove(ctx context.Context, pkg string) error
	Update(ctx context.Context) error
	Upgrade(ctx context.Context) error
	Search(ctx context.Context, query string) ([]Package, error)
	List(ctx context.Context) ([]Package, error)
}

// Package represents a system package
type Package struct {
	Name        string `json:"name"`
	Version     string `json:"version"`
	Description string `json:"description"`
	Installed   bool   `json:"installed"`
}

// Manager manages system packages
type Manager struct {
	pm     PackageManager
	logger *zap.Logger
}

// NewManager creates a new package manager
func NewManager(logger *zap.Logger) (*Manager, error) {
	var pm PackageManager
	var err error

	switch runtime.GOOS {
	case "linux":
		pm, err = detectLinuxPackageManager()
	case "darwin":
		pm = &BrewPackageManager{}
	default:
		return nil, fmt.Errorf("unsupported operating system: %s", runtime.GOOS)
	}

	if err != nil {
		return nil, err
	}

	return &Manager{
		pm:     pm,
		logger: logger,
	}, nil
}

// detectLinuxPackageManager detects the system package manager
func detectLinuxPackageManager() (PackageManager, error) {
	// Check for apt (Debian/Ubuntu)
	if _, err := exec.LookPath("apt"); err == nil {
		return &AptPackageManager{}, nil
	}

	// Check for dnf (Fedora/RHEL 8+)
	if _, err := exec.LookPath("dnf"); err == nil {
		return &DnfPackageManager{}, nil
	}

	// Check for yum (RHEL/CentOS)
	if _, err := exec.LookPath("yum"); err == nil {
		return &YumPackageManager{}, nil
	}

	// Check for pacman (Arch)
	if _, err := exec.LookPath("pacman"); err == nil {
		return &PacmanPackageManager{}, nil
	}

	// Check for zypper (openSUSE)
	if _, err := exec.LookPath("zypper"); err == nil {
		return &ZypperPackageManager{}, nil
	}

	return nil, fmt.Errorf("no supported package manager found")
}

// Install installs a package
func (m *Manager) Install(ctx context.Context, pkg string) error {
	m.logger.Info("Installing package", zap.String("package", pkg))
	return m.pm.Install(ctx, pkg)
}

// Remove removes a package
func (m *Manager) Remove(ctx context.Context, pkg string) error {
	m.logger.Info("Removing package", zap.String("package", pkg))
	return m.pm.Remove(ctx, pkg)
}

// Update updates package lists
func (m *Manager) Update(ctx context.Context) error {
	m.logger.Info("Updating package lists")
	return m.pm.Update(ctx)
}

// Upgrade upgrades all packages
func (m *Manager) Upgrade(ctx context.Context) error {
	m.logger.Info("Upgrading packages")
	return m.pm.Upgrade(ctx)
}

// Search searches for packages
func (m *Manager) Search(ctx context.Context, query string) ([]Package, error) {
	return m.pm.Search(ctx, query)
}

// List lists installed packages
func (m *Manager) List(ctx context.Context) ([]Package, error) {
	return m.pm.List(ctx)
}

// AptPackageManager implements PackageManager for apt
type AptPackageManager struct{}

func (pm *AptPackageManager) Install(ctx context.Context, pkg string) error {
	cmd := exec.CommandContext(ctx, "apt", "install", "-y", pkg)
	return cmd.Run()
}

func (pm *AptPackageManager) Remove(ctx context.Context, pkg string) error {
	cmd := exec.CommandContext(ctx, "apt", "remove", "-y", pkg)
	return cmd.Run()
}

func (pm *AptPackageManager) Update(ctx context.Context) error {
	cmd := exec.CommandContext(ctx, "apt", "update")
	return cmd.Run()
}

func (pm *AptPackageManager) Upgrade(ctx context.Context) error {
	cmd := exec.CommandContext(ctx, "apt", "upgrade", "-y")
	return cmd.Run()
}

func (pm *AptPackageManager) Search(ctx context.Context, query string) ([]Package, error) {
	cmd := exec.CommandContext(ctx, "apt", "search", query)
	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	var packages []Package
	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		if strings.HasPrefix(line, "WARNING") || strings.TrimSpace(line) == "" {
			continue
		}

		parts := strings.SplitN(line, "/", 2)
		if len(parts) != 2 {
			continue
		}

		name := parts[0]
		descParts := strings.SplitN(parts[1], "-", 2)
		if len(descParts) != 2 {
			continue
		}

		packages = append(packages, Package{
			Name:        name,
			Description: strings.TrimSpace(descParts[1]),
		})
	}

	return packages, nil
}

func (pm *AptPackageManager) List(ctx context.Context) ([]Package, error) {
	cmd := exec.CommandContext(ctx, "dpkg", "-l")
	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	var packages []Package
	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		if !strings.HasPrefix(line, "ii") {
			continue
		}

		fields := strings.Fields(line)
		if len(fields) < 3 {
			continue
		}

		packages = append(packages, Package{
			Name:      fields[1],
			Version:   fields[2],
			Installed: true,
		})
	}

	return packages, nil
}

// Similar implementations for other package managers (YumPackageManager, DnfPackageManager, etc.)
// would follow the same pattern but with their respective commands

// BrewPackageManager implements PackageManager for Homebrew
type BrewPackageManager struct{}

func (pm *BrewPackageManager) Install(ctx context.Context, pkg string) error {
	cmd := exec.CommandContext(ctx, "brew", "install", pkg)
	return cmd.Run()
}

func (pm *BrewPackageManager) Remove(ctx context.Context, pkg string) error {
	cmd := exec.CommandContext(ctx, "brew", "uninstall", pkg)
	return cmd.Run()
}

func (pm *BrewPackageManager) Update(ctx context.Context) error {
	cmd := exec.CommandContext(ctx, "brew", "update")
	return cmd.Run()
}

func (pm *BrewPackageManager) Upgrade(ctx context.Context) error {
	cmd := exec.CommandContext(ctx, "brew", "upgrade")
	return cmd.Run()
}

func (pm *BrewPackageManager) Search(ctx context.Context, query string) ([]Package, error) {
	cmd := exec.CommandContext(ctx, "brew", "search", query)
	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	var packages []Package
	lines := strings.Split(string(output), "\n")
	for _, line := range strings.Fields(string(output)) {
		if strings.TrimSpace(line) == "" {
			continue
		}

		packages = append(packages, Package{
			Name: line,
		})
	}

	return packages, nil
}

func (pm *BrewPackageManager) List(ctx context.Context) ([]Package, error) {
	cmd := exec.CommandContext(ctx, "brew", "list", "--versions")
	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	var packages []Package
	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		if strings.TrimSpace(line) == "" {
			continue
		}

		parts := strings.Fields(line)
		if len(parts) < 2 {
			continue
		}

		packages = append(packages, Package{
			Name:      parts[0],
			Version:   parts[1],
			Installed: true,
		})
	}

	return packages, nil
}
