package packages

import (
	"context"
	"fmt"
	"os/exec"
	"regexp"
	"strings"

	"go.uber.org/zap"
)

type PackageManager interface {
	Install(ctx context.Context, packages []string) error
	Remove(ctx context.Context, packages []string) error
	Update(ctx context.Context) error
	Upgrade(ctx context.Context) error
	Search(ctx context.Context, query string) ([]Package, error)
	List(ctx context.Context) ([]Package, error)
}

type Package struct {
	Name        string `json:"name"`
	Version     string `json:"version"`
	Description string `json:"description"`
	Source      string `json:"source"` // apt, snap, or flatpak
	Status      string `json:"status"`
}

type BasePackageManager struct {
	logger *zap.Logger
}

func (pm *BasePackageManager) validatePackageNames(packages []string) error {
	validName := regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9+._-]*$`)
	for _, pkg := range packages {
		if !validName.MatchString(pkg) {
			return fmt.Errorf("invalid package name: %s", pkg)
		}
	}
	return nil
}

type AptPackageManager struct {
	BasePackageManager
}

type SnapPackageManager struct {
	BasePackageManager
}

type FlatpakPackageManager struct {
	BasePackageManager
}

func NewPackageManager(logger *zap.Logger) ([]PackageManager, error) {
	var managers []PackageManager

	// Check for apt
	if _, err := exec.LookPath("apt-get"); err == nil {
		managers = append(managers, &AptPackageManager{BasePackageManager{logger}})
	}

	// Check for snap
	if _, err := exec.LookPath("snap"); err == nil {
		managers = append(managers, &SnapPackageManager{BasePackageManager{logger}})
	}

	// Check for flatpak
	if _, err := exec.LookPath("flatpak"); err == nil {
		managers = append(managers, &FlatpakPackageManager{BasePackageManager{logger}})
	}

	if len(managers) == 0 {
		return nil, fmt.Errorf("no supported package managers found")
	}

	return managers, nil
}

// AptPackageManager implementation
func (pm *AptPackageManager) Install(ctx context.Context, packages []string) error {
	if err := pm.validatePackageNames(packages); err != nil {
		return err
	}

	args := append([]string{"install", "-y"}, packages...)
	cmd := exec.CommandContext(ctx, "apt-get", args...)
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("apt install failed: %w (output: %s)", err, string(output))
	}
	return nil
}

func (pm *AptPackageManager) Remove(ctx context.Context, packages []string) error {
	if err := pm.validatePackageNames(packages); err != nil {
		return err
	}

	args := append([]string{"remove", "-y"}, packages...)
	cmd := exec.CommandContext(ctx, "apt-get", args...)
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("apt remove failed: %w (output: %s)", err, string(output))
	}
	return nil
}

func (pm *AptPackageManager) Update(ctx context.Context) error {
	cmd := exec.CommandContext(ctx, "apt-get", "update")
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("apt update failed: %w (output: %s)", err, string(output))
	}
	return nil
}

func (pm *AptPackageManager) Upgrade(ctx context.Context) error {
	cmd := exec.CommandContext(ctx, "apt-get", "upgrade", "-y")
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("apt upgrade failed: %w (output: %s)", err, string(output))
	}
	return nil
}

func (pm *AptPackageManager) Search(ctx context.Context, query string) ([]Package, error) {
	cmd := exec.CommandContext(ctx, "apt-cache", "search", query)
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("apt search failed: %w", err)
	}

	var packages []Package
	for _, line := range strings.Split(string(output), "\n") {
		if line == "" {
			continue
		}
		parts := strings.SplitN(line, " - ", 2)
		if len(parts) != 2 {
			continue
		}
		packages = append(packages, Package{
			Name:        parts[0],
			Description: parts[1],
			Source:      "apt",
		})
	}
	return packages, nil
}

func (pm *AptPackageManager) List(ctx context.Context) ([]Package, error) {
	cmd := exec.CommandContext(ctx, "dpkg-query", "-W", "-f=${Package}\t${Version}\t${Status}\t${binary:Summary}\n")
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("apt list failed: %w", err)
	}

	var packages []Package
	for _, line := range strings.Split(string(output), "\n") {
		if line == "" {
			continue
		}
		parts := strings.Split(line, "\t")
		if len(parts) != 4 {
			continue
		}
		packages = append(packages, Package{
			Name:        parts[0],
			Version:     parts[1],
			Status:      parts[2],
			Description: parts[3],
			Source:      "apt",
		})
	}
	return packages, nil
}

// SnapPackageManager implementation
func (pm *SnapPackageManager) Install(ctx context.Context, packages []string) error {
	if err := pm.validatePackageNames(packages); err != nil {
		return err
	}

	for _, pkg := range packages {
		cmd := exec.CommandContext(ctx, "snap", "install", pkg)
		if output, err := cmd.CombinedOutput(); err != nil {
			return fmt.Errorf("snap install failed for %s: %w (output: %s)", pkg, err, string(output))
		}
	}
	return nil
}

func (pm *SnapPackageManager) Remove(ctx context.Context, packages []string) error {
	if err := pm.validatePackageNames(packages); err != nil {
		return err
	}

	for _, pkg := range packages {
		cmd := exec.CommandContext(ctx, "snap", "remove", pkg)
		if output, err := cmd.CombinedOutput(); err != nil {
			return fmt.Errorf("snap remove failed for %s: %w (output: %s)", pkg, err, string(output))
		}
	}
	return nil
}

func (pm *SnapPackageManager) Update(ctx context.Context) error {
	cmd := exec.CommandContext(ctx, "snap", "refresh")
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("snap refresh failed: %w (output: %s)", err, string(output))
	}
	return nil
}

func (pm *SnapPackageManager) Upgrade(ctx context.Context) error {
	// snap refresh handles both update and upgrade
	return pm.Update(ctx)
}

func (pm *SnapPackageManager) Search(ctx context.Context, query string) ([]Package, error) {
	cmd := exec.CommandContext(ctx, "snap", "find", query)
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("snap search failed: %w", err)
	}

	var packages []Package
	lines := strings.Split(string(output), "\n")
	// Skip header line
	for i := 1; i < len(lines); i++ {
		line := lines[i]
		if line == "" {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) < 4 {
			continue
		}
		packages = append(packages, Package{
			Name:        fields[0],
			Version:     fields[1],
			Description: strings.Join(fields[3:], " "),
			Source:      "snap",
		})
	}
	return packages, nil
}

func (pm *SnapPackageManager) List(ctx context.Context) ([]Package, error) {
	cmd := exec.CommandContext(ctx, "snap", "list")
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("snap list failed: %w", err)
	}

	var packages []Package
	lines := strings.Split(string(output), "\n")
	// Skip header line
	for i := 1; i < len(lines); i++ {
		line := lines[i]
		if line == "" {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) < 5 {
			continue
		}
		packages = append(packages, Package{
			Name:    fields[0],
			Version: fields[1],
			Status:  fields[3],
			Source:  "snap",
		})
	}
	return packages, nil
}

// FlatpakPackageManager implementation
func (pm *FlatpakPackageManager) Install(ctx context.Context, packages []string) error {
	if err := pm.validatePackageNames(packages); err != nil {
		return err
	}

	args := append([]string{"install", "-y"}, packages...)
	cmd := exec.CommandContext(ctx, "flatpak", args...)
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("flatpak install failed: %w (output: %s)", err, string(output))
	}
	return nil
}

func (pm *FlatpakPackageManager) Remove(ctx context.Context, packages []string) error {
	if err := pm.validatePackageNames(packages); err != nil {
		return err
	}

	args := append([]string{"uninstall", "-y"}, packages...)
	cmd := exec.CommandContext(ctx, "flatpak", args...)
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("flatpak remove failed: %w (output: %s)", err, string(output))
	}
	return nil
}

func (pm *FlatpakPackageManager) Update(ctx context.Context) error {
	cmd := exec.CommandContext(ctx, "flatpak", "update", "-y")
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("flatpak update failed: %w (output: %s)", err, string(output))
	}
	return nil
}

func (pm *FlatpakPackageManager) Upgrade(ctx context.Context) error {
	// flatpak update handles both update and upgrade
	return pm.Update(ctx)
}

func (pm *FlatpakPackageManager) Search(ctx context.Context, query string) ([]Package, error) {
	cmd := exec.CommandContext(ctx, "flatpak", "search", query)
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("flatpak search failed: %w", err)
	}

	var packages []Package
	lines := strings.Split(string(output), "\n")
	for i := 0; i < len(lines); i += 2 {
		if i+1 >= len(lines) || lines[i] == "" {
			continue
		}
		name := strings.TrimSpace(lines[i])
		desc := strings.TrimSpace(lines[i+1])
		packages = append(packages, Package{
			Name:        name,
			Description: desc,
			Source:      "flatpak",
		})
	}
	return packages, nil
}

func (pm *FlatpakPackageManager) List(ctx context.Context) ([]Package, error) {
	cmd := exec.CommandContext(ctx, "flatpak", "list", "--app", "--columns=application,version,branch")
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("flatpak list failed: %w", err)
	}

	var packages []Package
	for _, line := range strings.Split(string(output), "\n") {
		if line == "" {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) < 3 {
			continue
		}
		packages = append(packages, Package{
			Name:    fields[0],
			Version: fields[1],
			Status:  fields[2],
			Source:  "flatpak",
		})
	}
	return packages, nil
}
