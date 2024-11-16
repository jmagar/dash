package backup

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"time"

	"go.uber.org/zap"
)

type Manager struct {
	config   *BackupConfig
	logger   *zap.Logger
	archiver *Archiver
}

func NewManager(config *BackupConfig, logger *zap.Logger) (*Manager, error) {
	if config.Path == "" {
		return nil, fmt.Errorf("backup path is required")
	}

	archiver := NewArchiver(logger)

	return &Manager{
		config:   config,
		logger:   logger,
		archiver: archiver,
	}, nil
}

func (m *Manager) Start(ctx context.Context) error {
	// Create backup directory if it doesn't exist
	if err := os.MkdirAll(m.config.Path, 0755); err != nil {
		return fmt.Errorf("failed to create backup directory: %w", err)
	}

	// Start backup scheduler
	go m.scheduleBackups(ctx)

	return nil
}

func (m *Manager) Shutdown(ctx context.Context) error {
	return nil
}

func (m *Manager) CreateBackup(ctx context.Context, source string) error {
	backupPath := filepath.Join(m.config.Path, fmt.Sprintf("backup_%s.tar.gz", time.Now().Format("20060102_150405")))

	// Create new archive
	if err := m.archiver.Create(backupPath); err != nil {
		return fmt.Errorf("failed to create archive: %w", err)
	}
	defer m.archiver.Close()

	// Enable encryption if configured
	if m.config.Encrypt {
		// In a real implementation, you would get this from a secure key management system
		key := []byte("0123456789abcdef0123456789abcdef")
		m.archiver.SetEncryption(key)
	}

	// Add source to archive
	fileInfo, err := os.Stat(source)
	if err != nil {
		return fmt.Errorf("failed to stat source: %w", err)
	}

	if fileInfo.IsDir() {
		if err := m.archiver.AddDirectory(source); err != nil {
			return fmt.Errorf("failed to add directory to archive: %w", err)
		}
	} else {
		if err := m.archiver.AddFile(source, filepath.Base(source)); err != nil {
			return fmt.Errorf("failed to add file to archive: %w", err)
		}
	}

	// Clean up old backups
	if err := m.cleanup(); err != nil {
		m.logger.Error("Failed to clean up old backups", zap.Error(err))
	}

	return nil
}

func (m *Manager) RestoreBackup(ctx context.Context, backupFile string, destination string) error {
	if m.config.Encrypt {
		// In a real implementation, you would get this from a secure key management system
		key := []byte("0123456789abcdef0123456789abcdef")
		m.archiver.SetEncryption(key)
	}

	return m.archiver.Extract(backupFile, destination)
}

func (m *Manager) ListBackups() ([]string, error) {
	files, err := os.ReadDir(m.config.Path)
	if err != nil {
		return nil, fmt.Errorf("failed to read backup directory: %w", err)
	}

	var backups []string
	for _, file := range files {
		if !file.IsDir() && filepath.Ext(file.Name()) == ".gz" {
			backups = append(backups, filepath.Join(m.config.Path, file.Name()))
		}
	}

	// Sort backups by modification time (newest first)
	sort.Slice(backups, func(i, j int) bool {
		iInfo, _ := os.Stat(backups[i])
		jInfo, _ := os.Stat(backups[j])
		return iInfo.ModTime().After(jInfo.ModTime())
	})

	return backups, nil
}

func (m *Manager) cleanup() error {
	files, err := m.ListBackups()
	if err != nil {
		return err
	}

	now := time.Now()

	for _, file := range files {
		info, err := os.Stat(file)
		if err != nil {
			m.logger.Error("Failed to get file info", zap.String("file", file), zap.Error(err))
			continue
		}

		// Remove files older than retention period
		if now.Sub(info.ModTime()) > m.config.Retention {
			if err := os.Remove(file); err != nil {
				m.logger.Error("Failed to remove old backup", zap.String("file", file), zap.Error(err))
			}
		}

		// Remove files if total size exceeds max size
		if m.config.MaxSize > 0 {
			var totalSize int64
			for _, f := range files {
				info, err := os.Stat(f)
				if err != nil {
					continue
				}
				totalSize += info.Size()
				if totalSize > m.config.MaxSize {
					if err := os.Remove(f); err != nil {
						m.logger.Error("Failed to remove backup", zap.String("file", f), zap.Error(err))
					}
				}
			}
		}
	}

	return nil
}

func (m *Manager) scheduleBackups(ctx context.Context) {
	if m.config.Interval == 0 {
		return
	}

	ticker := time.NewTicker(m.config.Interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := m.CreateBackup(ctx, m.config.Path); err != nil {
				m.logger.Error("Scheduled backup failed", zap.Error(err))
			}
		}
	}
}

func (m *Manager) HealthCheck(ctx context.Context) error {
	if _, err := os.Stat(m.config.Path); err != nil {
		return fmt.Errorf("backup directory not accessible: %w", err)
	}
	return nil
}
