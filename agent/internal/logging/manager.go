package logging

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sync"
	"time"

	"go.uber.org/zap"
	"gopkg.in/natefinch/lumberjack.v2"
)

// LogLevel represents log severity level
type LogLevel string

const (
	LevelDebug LogLevel = "debug"
	LevelInfo  LogLevel = "info"
	LevelWarn  LogLevel = "warn"
	LevelError LogLevel = "error"
)

// LogPattern represents a log pattern to match
type LogPattern struct {
	Pattern     string
	Level       LogLevel
	Description string
}

// LogConfig represents log file configuration
type LogConfig struct {
	MaxSize    int  // megabytes
	MaxAge     int  // days
	MaxBackups int  // number of backups
	Compress   bool // compress old files
}

// LogEntry represents a parsed log entry
type LogEntry struct {
	Timestamp   time.Time
	Level       LogLevel
	Message     string
	Source      string
	Pattern     string
	Description string
}

// Manager manages log files and patterns
type Manager struct {
	logger   *zap.Logger
	mu       sync.RWMutex
	files    map[string]*logFile
	patterns []LogPattern
}

// logFile represents a monitored log file
type logFile struct {
	path   string
	config LogConfig
	writer *lumberjack.Logger
	done   chan struct{}
}

// NewManager creates a new log manager
func NewManager(logger *zap.Logger) *Manager {
	return &Manager{
		logger: logger,
		files:  make(map[string]*logFile),
	}
}

// AddLogFile adds a log file to monitor
func (m *Manager) AddLogFile(path string, config LogConfig) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, exists := m.files[path]; exists {
		return fmt.Errorf("log file already monitored: %s", path)
	}

	// Create directory if it doesn't exist
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	// Configure log rotation
	writer := &lumberjack.Logger{
		Filename:   path,
		MaxSize:    config.MaxSize,
		MaxAge:     config.MaxAge,
		MaxBackups: config.MaxBackups,
		Compress:   config.Compress,
	}

	m.files[path] = &logFile{
		path:   path,
		config: config,
		writer: writer,
		done:   make(chan struct{}),
	}

	return nil
}

// RemoveLogFile removes a log file from monitoring
func (m *Manager) RemoveLogFile(path string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	file, exists := m.files[path]
	if !exists {
		return fmt.Errorf("log file not monitored: %s", path)
	}

	close(file.done)
	delete(m.files, path)

	return nil
}

// AddPattern adds a log pattern to match
func (m *Manager) AddPattern(pattern LogPattern) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.patterns = append(m.patterns, pattern)
}

// Start starts log monitoring
func (m *Manager) Start(ctx context.Context) error {
	m.mu.RLock()
	files := make([]*logFile, 0, len(m.files))
	for _, file := range m.files {
		files = append(files, file)
	}
	m.mu.RUnlock()

	// Monitor each file
	for _, file := range files {
		go m.monitorFile(ctx, file)
	}

	return nil
}

// monitorFile monitors a single log file
func (m *Manager) monitorFile(ctx context.Context, file *logFile) {
	f, err := os.Open(file.path)
	if err != nil {
		m.logger.Error("Failed to open log file",
			zap.String("path", file.path),
			zap.Error(err))
		return
	}
	defer f.Close()

	// Seek to end of file
	if _, err := f.Seek(0, 2); err != nil {
		m.logger.Error("Failed to seek log file",
			zap.String("path", file.path),
			zap.Error(err))
		return
	}

	reader := bufio.NewReader(f)

	for {
		select {
		case <-ctx.Done():
			return
		case <-file.done:
			return
		default:
			line, err := reader.ReadString('\n')
			if err != nil {
				time.Sleep(100 * time.Millisecond)
				continue
			}

			// Parse and match patterns
			entry := m.parseLine(line, file.path)
			if entry != nil {
				m.processEntry(entry)
			}
		}
	}
}

// parseLine parses a log line into a LogEntry
func (m *Manager) parseLine(line, source string) *LogEntry {
	m.mu.RLock()
	patterns := make([]LogPattern, len(m.patterns))
	copy(patterns, m.patterns)
	m.mu.RUnlock()

	for _, pattern := range patterns {
		if matched, _ := regexp.MatchString(pattern.Pattern, line); matched {
			return &LogEntry{
				Timestamp:   time.Now(),
				Level:       pattern.Level,
				Message:     line,
				Source:     source,
				Pattern:    pattern.Pattern,
				Description: pattern.Description,
			}
		}
	}

	return nil
}

// processEntry processes a matched log entry
func (m *Manager) processEntry(entry *LogEntry) {
	// Log the entry
	m.logger.Info("Log pattern matched",
		zap.String("source", entry.Source),
		zap.String("pattern", entry.Pattern),
		zap.String("level", string(entry.Level)),
		zap.String("description", entry.Description),
		zap.String("message", entry.Message))
}

// GetEntries returns log entries matching filters
func (m *Manager) GetEntries(filters map[string]interface{}) []LogEntry {
	// Implementation of log entry filtering
	// This is a placeholder for actual implementation
	return nil
}

// Write implements io.Writer for direct logging
func (m *Manager) Write(p []byte) (n int, err error) {
	m.mu.RLock()
	files := make([]*logFile, 0, len(m.files))
	for _, file := range m.files {
		files = append(files, file)
	}
	m.mu.RUnlock()

	for _, file := range files {
		if _, err := file.writer.Write(p); err != nil {
			m.logger.Error("Failed to write to log file",
				zap.String("path", file.path),
				zap.Error(err))
		}
	}

	return len(p), nil
}

// Close closes all log files
func (m *Manager) Close() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	for _, file := range m.files {
		close(file.done)
		if err := file.writer.Close(); err != nil {
			m.logger.Error("Failed to close log file",
				zap.String("path", file.path),
				zap.Error(err))
		}
	}

	return nil
}
