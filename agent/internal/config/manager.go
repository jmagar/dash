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
}

// NewManager creates a new configuration manager
func NewManager(logger *zap.Logger) (*Manager, error) {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, fmt.Errorf("failed to create watcher: %w", err)
	}

	return &Manager{
		logger:  logger,
		configs: make(map[string]*ConfigFile),
		watcher: watcher,
		changes: make([]ConfigChange, 0),
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
		return nil, err
	}
	defer file.Close()

	content := make(map[string]interface{})

	switch format {
	case FormatJSON:
		if err := json.NewDecoder(file).Decode(&content); err != nil {
			return nil, err
		}
	case FormatYAML:
		if err := yaml.NewDecoder(file).Decode(&content); err != nil {
			return nil, err
		}
	case FormatINI:
		// Implement INI parsing
		return nil, fmt.Errorf("INI format not implemented")
	case FormatENV:
		// Implement ENV parsing
		return nil, fmt.Errorf("ENV format not implemented")
	default:
		return nil, fmt.Errorf("unsupported format: %s", format)
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

	config, ok := m.configs[path]
	if !ok {
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
	config, ok := m.GetConfig(path)
	if !ok {
		return fmt.Errorf("config not found: %s", path)
	}

	// Implement validation logic
	// This would need to be customized based on the config type
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
