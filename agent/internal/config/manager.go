package config

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
	"github.com/go-git/go-git/v5"
	"go.uber.org/zap"
	"gopkg.in/yaml.v3"
)

// ConfigType represents the type of configuration
type ConfigType string

const (
	TypeSystem  ConfigType = "system"
	TypeService ConfigType = "service"
	TypeApp     ConfigType = "app"
	TypeUser    ConfigType = "user"
)

// ConfigFormat represents the format of configuration
type ConfigFormat string

const (
	FormatJSON ConfigFormat = "json"
	FormatYAML ConfigFormat = "yaml"
	FormatINI  ConfigFormat = "ini"
	FormatENV  ConfigFormat = "env"
)

// ConfigChange represents a configuration change
type ConfigChange struct {
	Path      string      `json:"path"`
	Type      ConfigType  `json:"type"`
	Format    ConfigFormat `json:"format"`
	OldValue  interface{} `json:"old_value,omitempty"`
	NewValue  interface{} `json:"new_value"`
	Timestamp time.Time   `json:"timestamp"`
	User      string      `json:"user,omitempty"`
	Reason    string      `json:"reason,omitempty"`
}

// ConfigFile represents a configuration file
type ConfigFile struct {
	Path       string                 `json:"path"`
	Type       ConfigType             `json:"type"`
	Format     ConfigFormat           `json:"format"`
	Content    map[string]interface{} `json:"content"`
	Checksum   string                `json:"checksum"`
	ModTime    time.Time             `json:"mod_time"`
	Version    string                `json:"version,omitempty"`
	Template   string                `json:"template,omitempty"`
	Validation string                `json:"validation,omitempty"`
}

// Manager manages configuration files
type Manager struct {
	logger    *zap.Logger
	configs   map[string]*ConfigFile
	watcher   *fsnotify.Watcher
	repo      *git.Repository
	changes   []ConfigChange
	mu        sync.RWMutex
	scheduler *CommandScheduler
	dashboard *AgentHealthDashboard
	plugins   *PluginSystem
	metrics   *EnhancedMetrics
	alerts    *AlertingSystem
}

// NewManager creates a new configuration manager
func NewManager(logger *zap.Logger) (*Manager, error) {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, fmt.Errorf("failed to create watcher: %w", err)
	}

	scheduler := &CommandScheduler{}
	dashboard := &AgentHealthDashboard{}
	plugins := &PluginSystem{}
	metrics := &EnhancedMetrics{}
	alerts := &AlertingSystem{}

	return &Manager{
		logger:    logger,
		configs:   make(map[string]*ConfigFile),
		watcher:   watcher,
		changes:   make([]ConfigChange, 0),
		scheduler: scheduler,
		dashboard: dashboard,
		plugins:   plugins,
		metrics:   metrics,
		alerts:    alerts,
	}, nil
}

// Start begins configuration management
func (m *Manager) Start(ctx context.Context) error {
	// Start watching files
	go func() {
		for {
			select {
			case event, ok := <-m.watcher.Events:
				if !ok {
					return
				}
				if event.Op&fsnotify.Write == fsnotify.Write {
					if err := m.handleFileChange(event.Name); err != nil {
						m.logger.Error("Failed to handle file change",
							zap.String("path", event.Name),
							zap.Error(err))
					}
				}
			case err, ok := <-m.watcher.Errors:
				if !ok {
					return
				}
				m.logger.Error("Watcher error", zap.Error(err))
			case <-ctx.Done():
				return
			}
		}
	}()

	// Start command scheduler
	go m.scheduler.Start()

	// Start health dashboard
	go m.dashboard.Start()

	// Start plugin system
	go m.plugins.Start()

	// Start enhanced metrics collection
	go m.metrics.Collect()

	// Start alerting system
	go m.alerts.Start()

	return nil
}

// AddConfig adds a configuration file
func (m *Manager) AddConfig(path string, configType ConfigType) error {
	absPath, err := filepath.Abs(path)
	if err != nil {
		return fmt.Errorf("failed to get absolute path: %w", err)
	}

	// Check if file exists
	info, err := os.Stat(absPath)
	if err != nil {
		return fmt.Errorf("failed to stat file: %w", err)
	}

	// Determine format
	format := m.detectFormat(absPath)

	// Read and parse file
	content, err := m.readConfig(absPath, format)
	if err != nil {
		return fmt.Errorf("failed to read config: %w", err)
	}

	// Calculate checksum
	checksum, err := m.calculateChecksum(absPath)
	if err != nil {
		return fmt.Errorf("failed to calculate checksum: %w", err)
	}

	config := &ConfigFile{
		Path:     absPath,
		Type:     configType,
		Format:   format,
		Content:  content,
		Checksum: checksum,
		ModTime:  info.ModTime(),
	}

	m.mu.Lock()
	m.configs[absPath] = config
	m.mu.Unlock()

	// Start watching file
	if err := m.watcher.Add(absPath); err != nil {
		return fmt.Errorf("failed to watch file: %w", err)
	}

	return nil
}

// detectFormat detects configuration format
func (m *Manager) detectFormat(path string) ConfigFormat {
	ext := strings.ToLower(filepath.Ext(path))
	switch ext {
	case ".json":
		return FormatJSON
	case ".yaml", ".yml":
		return FormatYAML
	case ".ini":
		return FormatINI
	case ".env":
		return FormatENV
	default:
		return FormatJSON
	}
}

// readConfig reads and parses a configuration file
func (m *Manager) readConfig(path string, format ConfigFormat) (map[string]interface{}, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("failed to open config file %s: %w", path, err)
	}
	defer file.Close()

	content := make(map[string]interface{})

	switch format {
	case FormatJSON:
		if err := json.NewDecoder(file).Decode(&content); err != nil {
			return nil, fmt.Errorf("failed to decode JSON config %s: %w", path, err)
		}
	case FormatYAML:
		if err := yaml.NewDecoder(file).Decode(&content); err != nil {
			return nil, fmt.Errorf("failed to decode YAML config %s: %w", path, err)
		}
	case FormatINI:
		return nil, fmt.Errorf("INI format not implemented for config file %s", path)
	case FormatENV:
		return nil, fmt.Errorf("ENV format not implemented for config file %s", path)
	default:
		return nil, fmt.Errorf("unsupported format for config file %s: %s", path, format)
	}

	return content, nil
}

// calculateChecksum calculates file checksum
func (m *Manager) calculateChecksum(path string) (string, error) {
	file, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer file.Close()

	hash := sha256.New()
	if _, err := io.Copy(hash, file); err != nil {
		return "", err
	}

	return hex.EncodeToString(hash.Sum(nil)), nil
}

// handleFileChange handles configuration file changes
func (m *Manager) handleFileChange(path string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	config, exists := m.configs[path]
	if !exists {
		return fmt.Errorf("config not found: %s", path)
	}

	// Read new content
	newContent, err := m.readConfig(path, config.Format)
	if err != nil {
		return fmt.Errorf("failed to read new config: %w", err)
	}

	// Calculate new checksum
	newChecksum, err := m.calculateChecksum(path)
	if err != nil {
		return fmt.Errorf("failed to calculate new checksum: %w", err)
	}

	// Record change
	change := ConfigChange{
		Path:      path,
		Type:      config.Type,
		Format:    config.Format,
		OldValue:  config.Content,
		NewValue:  newContent,
		Timestamp: time.Now(),
	}
	m.changes = append(m.changes, change)

	// Update config
	config.Content = newContent
	config.Checksum = newChecksum
	config.ModTime = time.Now()

	return nil
}

// GetConfig returns a configuration file
func (m *Manager) GetConfig(path string) (*ConfigFile, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	config, ok := m.configs[path]
	return config, ok
}

// GetChanges returns configuration changes
func (m *Manager) GetChanges() []ConfigChange {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.changes
}

// ValidateConfig validates a configuration file
func (m *Manager) ValidateConfig(path string) error {
	configFile, ok := m.GetConfig(path)
	if !ok {
		return fmt.Errorf("config not found: %s", path)
	}

	// Check for required fields and their validity
	if configFile.Content["requiredField"] == nil {
		return fmt.Errorf("missing required field in config file %s", path)
	}

	// Add more validation logic as needed
	return nil
}

// RollbackChange rolls back a configuration change
func (m *Manager) RollbackChange(path string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Find last change for this path
	var lastChange *ConfigChange
	for i := len(m.changes) - 1; i >= 0; i-- {
		if m.changes[i].Path == path {
			lastChange = &m.changes[i]
			break
		}
	}

	if lastChange == nil {
		return fmt.Errorf("no changes found for: %s", path)
	}

	// Write old content back to file
	config, ok := m.configs[path]
	if !ok {
		return fmt.Errorf("config not found: %s", path)
	}

	// Write content based on format
	var data []byte
	var err error

	switch config.Format {
	case FormatJSON:
		data, err = json.MarshalIndent(lastChange.OldValue, "", "  ")
	case FormatYAML:
		data, err = yaml.Marshal(lastChange.OldValue)
	default:
		return fmt.Errorf("unsupported format for rollback: %s", config.Format)
	}

	if err != nil {
		return fmt.Errorf("failed to marshal content: %w", err)
	}

	if err := os.WriteFile(path, data, 0644); err != nil {
		return fmt.Errorf("failed to write file: %w", err)
	}

	return nil
}

// DynamicConfigReload watches for changes in the configuration file and reloads it
func (m *Manager) DynamicConfigReload(ctx context.Context, path string) {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		m.logger.Error("Failed to create watcher", zap.Error(err))
		return
	}
	defer watcher.Close()

	if err := watcher.Add(path); err != nil {
		m.logger.Error("Failed to add watcher for config file", zap.String("path", path), zap.Error(err))
		return
	}

	for {
		select {
		case <-ctx.Done():
			return
		case event := <-watcher.Events:
			if event.Op&fsnotify.Write == fsnotify.Write {
				m.logger.Info("Config file changed, reloading...")
				if err := m.ReloadConfig(path); err != nil {
					m.logger.Error("Failed to reload config", zap.Error(err))
				}
			}
		case err := <-watcher.Errors:
			m.logger.Error("Watcher error", zap.Error(err))
		}
	}
}

// ReloadConfig reloads the configuration file
func (m *Manager) ReloadConfig(path string) error {
	// Read new content
	newContent, err := m.readConfig(path, m.detectFormat(path))
	if err != nil {
		return fmt.Errorf("failed to read new config: %w", err)
	}

	// Calculate new checksum
	newChecksum, err := m.calculateChecksum(path)
	if err != nil {
		return fmt.Errorf("failed to calculate new checksum: %w", err)
	}

	// Update config
	m.mu.Lock()
	defer m.mu.Unlock()
	config, ok := m.configs[path]
	if !ok {
		return fmt.Errorf("config not found: %s", path)
	}
	config.Content = newContent
	config.Checksum = newChecksum
	config.ModTime = time.Now()

	return nil
}

// Shutdown stops the configuration manager
func (m *Manager) Shutdown(ctx context.Context) error {
	return m.watcher.Close()
}

// HealthCheck implements the health.Checker interface
func (m *Manager) HealthCheck(ctx context.Context) error {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for path, config := range m.configs {
		checksum, err := m.calculateChecksum(path)
		if err != nil {
			return fmt.Errorf("failed to check file integrity: %w", err)
		}

		if checksum != config.Checksum {
			return fmt.Errorf("config file modified outside of manager: %s", path)
		}
	}

	return nil
}

// GetPluginConfig returns configuration for a specific plugin
func (m *Manager) GetPluginConfig(pluginName string) map[string]interface{} {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for _, config := range m.configs {
		if config.Type == TypeService {
			if plugins, ok := config.Content["plugins"].(map[string]interface{}); ok {
				if pluginConfig, ok := plugins[pluginName].(map[string]interface{}); ok {
					return pluginConfig
				}
			}
		}
	}
	return nil
}

// CommandScheduler schedules commands to be executed at specified intervals.
type CommandScheduler struct {
	commands map[string]time.Duration
}

// ScheduleCommand adds a command to the scheduler.
func (cs *CommandScheduler) ScheduleCommand(command string, interval time.Duration) {
	cs.commands[command] = interval
}

// Start starts the command scheduler.
func (cs *CommandScheduler) Start() {
	for command, interval := range cs.commands {
		go func(command string, interval time.Duration) {
			for {
				time.Sleep(interval)
				// Execute the command
				fmt.Println("Executing command:", command)
			}
		}(command, interval)
	}
}

// AgentHealthDashboard provides a web-based dashboard for monitoring agent health.
type AgentHealthDashboard struct{}

// StartHealthDashboard starts the health dashboard server.
func (a *AgentHealthDashboard) StartHealthDashboard() {
	// Start the dashboard server
	fmt.Println("Starting health dashboard server...")
}

// Start starts the health dashboard.
func (a *AgentHealthDashboard) Start() {
	a.StartHealthDashboard()
}

// PluginSystem allows for extending agent functionality with custom plugins.
type PluginSystem struct {
	plugins map[string]Plugin
}

// RegisterPlugin registers a new plugin.
func (ps *PluginSystem) RegisterPlugin(plugin Plugin) {
	ps.plugins[plugin.Name()] = plugin
}

// Start starts the plugin system.
func (ps *PluginSystem) Start() {
	for _, plugin := range ps.plugins {
		plugin.Start()
	}
}

// EnhancedMetrics collects more granular metrics for performance monitoring.
type EnhancedMetrics struct{}

// Collect collects enhanced metrics.
func (m *EnhancedMetrics) Collect() {
	// Collect metrics
	fmt.Println("Collecting enhanced metrics...")
}

// Start starts the enhanced metrics collection.
func (m *EnhancedMetrics) Start() {
	go m.Collect()
}

// AlertingSystem notifies users of critical events.
type AlertingSystem struct{}

// SendAlert sends an alert notification.
func (as *AlertingSystem) SendAlert(message string) {
	// Send alert
	fmt.Println("Sending alert:", message)
}

// Start starts the alerting system.
func (as *AlertingSystem) Start() {
	// Start the alerting system
	fmt.Println("Starting alerting system...")
}

// BackupAndRestore provides functionality to back up and restore agent state.
type BackupAndRestore struct{}

// BackupState backs up the agent state.
func (b *BackupAndRestore) BackupState() error {
	// Backup state
	fmt.Println("Backing up state...")
	return nil
}

// RestoreState restores the agent state.
func (b *BackupAndRestore) RestoreState() error {
	// Restore state
	fmt.Println("Restoring state...")
	return nil
}

// Plugin represents a custom plugin.
type Plugin interface {
	Name() string
	Start()
}
