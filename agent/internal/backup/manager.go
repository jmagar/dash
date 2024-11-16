package backup

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/aws/aws-sdk-go-v2/service/s3"
	"go.uber.org/zap"
)

// BackupType represents the type of backup
type BackupType string

const (
	TypeFull     BackupType = "full"
	TypePartial  BackupType = "partial"
	TypeDatabase BackupType = "database"
	TypeConfig   BackupType = "config"
)

// BackupStatus represents the status of a backup
type BackupStatus string

const (
	StatusPending   BackupStatus = "pending"
	StatusRunning   BackupStatus = "running"
	StatusComplete  BackupStatus = "complete"
	StatusFailed    BackupStatus = "failed"
	StatusCancelled BackupStatus = "cancelled"
)

// Config represents backup configuration
type Config struct {
	Path      string
	Retention int
	Schedule  string
	Compress  bool
	Encrypt   bool
}

// Backup represents a backup operation
type Backup struct {
	ID          string
	Type        BackupType
	Status      BackupStatus
	Path        string
	Size        int64
	Hash        string
	StartTime   time.Time
	EndTime     *time.Time
	Error       string
	Compressed  bool
	Encrypted   bool
}

// Manager manages backup operations
type Manager struct {
	logger   *zap.Logger
	mu       sync.RWMutex
	config   Config
	backups  map[string]*Backup
	s3Client *s3.Client
}

// NewManager creates a new backup manager
func NewManager(logger *zap.Logger) *Manager {
	return &Manager{
		logger:  logger,
		backups: make(map[string]*Backup),
	}
}

// Configure configures the backup manager
func (m *Manager) Configure(config Config) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Validate configuration
	if config.Path == "" {
		return fmt.Errorf("backup path is required")
	}

	// Create backup directory if it doesn't exist
	if err := os.MkdirAll(config.Path, 0755); err != nil {
		return fmt.Errorf("failed to create backup directory: %w", err)
	}

	m.config = config
	return nil
}

// CreateBackup creates a new backup
func (m *Manager) CreateBackup(ctx context.Context, backupType BackupType) (*Backup, error) {
	m.mu.Lock()
	config := m.config
	m.mu.Unlock()

	// Generate backup ID
	id := fmt.Sprintf("backup_%s_%d", backupType, time.Now().Unix())

	// Create backup
	backup := &Backup{
		ID:        id,
		Type:      backupType,
		Status:    StatusPending,
		Path:      filepath.Join(config.Path, id+".tar.gz"),
		StartTime: time.Now(),
		Compressed: config.Compress,
		Encrypted:  config.Encrypt,
	}

	// Add to tracking
	m.mu.Lock()
	m.backups[id] = backup
	m.mu.Unlock()

	// Start backup process
	go func() {
		if err := m.performBackup(ctx, backup); err != nil {
			m.logger.Error("Backup failed",
				zap.String("id", backup.ID),
				zap.Error(err))

			m.mu.Lock()
			backup.Status = StatusFailed
			backup.Error = err.Error()
			now := time.Now()
			backup.EndTime = &now
			m.mu.Unlock()
		}
	}()

	return backup, nil
}

// performBackup performs the actual backup operation
func (m *Manager) performBackup(ctx context.Context, backup *Backup) error {
	m.mu.Lock()
	backup.Status = StatusRunning
	m.mu.Unlock()

	// Create temporary file
	tmpFile, err := os.CreateTemp("", "backup-*")
	if err != nil {
		return fmt.Errorf("failed to create temporary file: %w", err)
	}
	defer os.Remove(tmpFile.Name())

	// Create hash
	hash := sha256.New()
	writer := io.MultiWriter(tmpFile, hash)

	// Perform backup based on type
	switch backup.Type {
	case TypeFull:
		err = m.backupFull(ctx, writer)
	case TypePartial:
		err = m.backupPartial(ctx, writer)
	case TypeDatabase:
		err = m.backupDatabase(ctx, writer)
	case TypeConfig:
		err = m.backupConfig(ctx, writer)
	default:
		err = fmt.Errorf("unsupported backup type: %s", backup.Type)
	}

	if err != nil {
		return fmt.Errorf("backup operation failed: %w", err)
	}

	// Get file size
	info, err := tmpFile.Stat()
	if err != nil {
		return fmt.Errorf("failed to get file info: %w", err)
	}

	// Update backup info
	m.mu.Lock()
	backup.Size = info.Size()
	backup.Hash = hex.EncodeToString(hash.Sum(nil))
	m.mu.Unlock()

	// Move to final location
	if err := os.Rename(tmpFile.Name(), backup.Path); err != nil {
		return fmt.Errorf("failed to move backup file: %w", err)
	}

	// Upload to S3 if configured
	if m.s3Client != nil {
		if err := m.uploadToS3(ctx, backup); err != nil {
			return fmt.Errorf("failed to upload to S3: %w", err)
		}
	}

	// Update status
	m.mu.Lock()
	backup.Status = StatusComplete
	now := time.Now()
	backup.EndTime = &now
	m.mu.Unlock()

	// Clean up old backups
	if err := m.cleanupOldBackups(ctx); err != nil {
		m.logger.Error("Failed to clean up old backups",
			zap.Error(err))
	}

	return nil
}

// backupFull performs a full system backup
func (m *Manager) backupFull(ctx context.Context, writer io.Writer) error {
	// Implementation of full backup
	// This is a placeholder for actual implementation
	return nil
}

// backupPartial performs a partial backup
func (m *Manager) backupPartial(ctx context.Context, writer io.Writer) error {
	// Implementation of partial backup
	// This is a placeholder for actual implementation
	return nil
}

// backupDatabase performs a database backup
func (m *Manager) backupDatabase(ctx context.Context, writer io.Writer) error {
	// Implementation of database backup
	// This is a placeholder for actual implementation
	return nil
}

// backupConfig performs a configuration backup
func (m *Manager) backupConfig(ctx context.Context, writer io.Writer) error {
	// Implementation of config backup
	// This is a placeholder for actual implementation
	return nil
}

// cleanupOldBackups removes old backups based on retention policy
func (m *Manager) cleanupOldBackups(ctx context.Context) error {
	m.mu.Lock()
	retention := m.config.Retention
	m.mu.Unlock()

	if retention <= 0 {
		return nil
	}

	// Get list of backups
	files, err := filepath.Glob(filepath.Join(m.config.Path, "backup_*.tar.gz"))
	if err != nil {
		return fmt.Errorf("failed to list backup files: %w", err)
	}

	// Sort by modification time
	sort.Slice(files, func(i, j int) bool {
		iInfo, _ := os.Stat(files[i])
		jInfo, _ := os.Stat(files[j])
		return iInfo.ModTime().After(jInfo.ModTime())
	})

	// Remove old backups
	for i := retention; i < len(files); i++ {
		if err := os.Remove(files[i]); err != nil {
			m.logger.Error("Failed to remove old backup",
				zap.String("file", files[i]),
				zap.Error(err))
		} else {
			m.logger.Info("Removed old backup",
				zap.String("file", files[i]))
		}
	}

	return nil
}

// GetBackup returns a specific backup
func (m *Manager) GetBackup(id string) (*Backup, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	backup, exists := m.backups[id]
	return backup, exists
}

// GetBackups returns all backups
func (m *Manager) GetBackups() []*Backup {
	m.mu.RLock()
	defer m.mu.RUnlock()

	backups := make([]*Backup, 0, len(m.backups))
	for _, backup := range m.backups {
		backups = append(backups, backup)
	}

	return backups
}

// CancelBackup cancels a running backup
func (m *Manager) CancelBackup(id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	backup, exists := m.backups[id]
	if !exists {
		return fmt.Errorf("backup not found: %s", id)
	}

	if backup.Status != StatusRunning {
		return fmt.Errorf("backup is not running: %s", id)
	}

	backup.Status = StatusCancelled
	now := time.Now()
	backup.EndTime = &now

	return nil
}

// DeleteBackup deletes a backup
func (m *Manager) DeleteBackup(id string) error {
	m.mu.Lock()
	backup, exists := m.backups[id]
	if !exists {
		m.mu.Unlock()
		return fmt.Errorf("backup not found: %s", id)
	}

	// Don't delete running backups
	if backup.Status == StatusRunning {
		m.mu.Unlock()
		return fmt.Errorf("cannot delete running backup: %s", id)
	}

	// Delete file
	if err := os.Remove(backup.Path); err != nil && !os.IsNotExist(err) {
		m.mu.Unlock()
		return fmt.Errorf("failed to delete backup file: %w", err)
	}

	delete(m.backups, id)
	m.mu.Unlock()

	return nil
}

// SetS3Client sets the S3 client for cloud storage
func (m *Manager) SetS3Client(client *s3.Client) {
	m.mu.Lock()
	m.s3Client = client
	m.mu.Unlock()
}

// uploadToS3 uploads a backup to S3
func (m *Manager) uploadToS3(ctx context.Context, backup *Backup) error {
	// Implementation of S3 upload
	// This is a placeholder for actual implementation
	return nil
}
