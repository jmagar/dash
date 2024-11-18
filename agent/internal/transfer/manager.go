package transfer

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sync"
	"time"

	"go.uber.org/zap"
)

// TransferType represents the type of transfer
type TransferType string

const (
	// TypeUpload represents a file upload
	TypeUpload TransferType = "upload"
	// TypeDownload represents a file download
	TypeDownload TransferType = "download"
)

// TransferState represents the state of a transfer
type TransferState string

const (
	// StateStarting indicates the transfer is starting
	StateStarting TransferState = "starting"
	// StateTransferring indicates the transfer is in progress
	StateTransferring TransferState = "transferring"
	// StateVerifying indicates the transfer is being verified
	StateVerifying TransferState = "verifying"
	// StateComplete indicates the transfer is complete
	StateComplete TransferState = "complete"
	// StateFailed indicates the transfer failed
	StateFailed TransferState = "failed"
)

// Transfer represents a file transfer operation
type Transfer struct {
	ID            string       `json:"id"`
	Type          TransferType `json:"type"`
	State         TransferState `json:"state"`
	SourcePath    string       `json:"source_path"`
	DestPath      string       `json:"dest_path"`
	Size          int64        `json:"size"`
	Transferred   int64        `json:"transferred"`
	StartTime     time.Time    `json:"start_time"`
	EndTime       time.Time    `json:"end_time,omitempty"`
	Error         string       `json:"error,omitempty"`
	Checksum      string       `json:"checksum,omitempty"`
	cancel        context.CancelFunc
	progressChan  chan int64
}

// Manager handles file transfers
type Manager struct {
	transfers  map[string]*Transfer
	logger     *zap.Logger
	mu         sync.RWMutex
	uploadDir  string
	maxSize    int64
	bufferSize int
}

// NewManager creates a new transfer manager
func NewManager(uploadDir string, maxSize int64, logger *zap.Logger) (*Manager, error) {
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create upload directory: %w", err)
	}

	return &Manager{
		transfers:  make(map[string]*Transfer),
		logger:     logger,
		uploadDir:  uploadDir,
		maxSize:    maxSize,
		bufferSize: 32 * 1024, // 32KB buffer
	}, nil
}

// StartUpload begins a file upload
func (m *Manager) StartUpload(parentCtx context.Context, id, filename string, size int64) (*Transfer, error) {
	if size > m.maxSize {
		return nil, fmt.Errorf("file size exceeds maximum allowed size")
	}

	destPath := filepath.Join(m.uploadDir, id)
	ctx, cancel := context.WithCancel(parentCtx)

	transfer := &Transfer{
		ID:           id,
		Type:         TypeUpload,
		State:        StateStarting,
		SourcePath:   filename,
		DestPath:     destPath,
		Size:         size,
		StartTime:    time.Now(),
		cancel:       cancel,
		progressChan: make(chan int64, 100),
	}

	m.mu.Lock()
	m.transfers[id] = transfer
	m.mu.Unlock()

	// Monitor context cancellation
	go func() {
		<-ctx.Done()
		if transfer.State != StateComplete {
			m.logger.Info("Upload cancelled by context",
				zap.String("id", id),
				zap.String("state", string(transfer.State)))
			transfer.State = StateFailed
			transfer.Error = "cancelled by context"
			transfer.EndTime = time.Now()
		}
	}()

	return transfer, nil
}

// WriteChunk writes a chunk of data to an upload
func (m *Manager) WriteChunk(id string, data []byte, offset int64) error {
	m.mu.RLock()
	transfer, exists := m.transfers[id]
	m.mu.RUnlock()

	if !exists {
		return fmt.Errorf("transfer not found: %s", id)
	}

	if transfer.State != StateStarting && transfer.State != StateTransferring {
		return fmt.Errorf("transfer in invalid state: %s", transfer.State)
	}

	f, err := os.OpenFile(transfer.DestPath, os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return fmt.Errorf("failed to open file: %w", err)
	}
	defer f.Close()

	if _, err := f.Seek(offset, io.SeekStart); err != nil {
		return fmt.Errorf("failed to seek: %w", err)
	}

	if _, err := f.Write(data); err != nil {
		return fmt.Errorf("failed to write: %w", err)
	}

	transfer.State = StateTransferring
	transfer.Transferred += int64(len(data))
	transfer.progressChan <- transfer.Transferred

	return nil
}

// FinishTransfer completes a transfer
func (m *Manager) FinishTransfer(id string) error {
	m.mu.RLock()
	transfer, exists := m.transfers[id]
	m.mu.RUnlock()

	if !exists {
		return fmt.Errorf("transfer not found: %s", id)
	}

	// Verify file size
	info, err := os.Stat(transfer.DestPath)
	if err != nil {
		return fmt.Errorf("failed to stat file: %w", err)
	}

	if info.Size() != transfer.Size {
		transfer.State = StateFailed
		transfer.Error = "size mismatch"
		return fmt.Errorf("size mismatch")
	}

	// Calculate checksum
	transfer.State = StateVerifying
	checksum, err := m.calculateChecksum(transfer.DestPath)
	if err != nil {
		transfer.State = StateFailed
		transfer.Error = fmt.Sprintf("checksum failed: %v", err)
		return fmt.Errorf("checksum failed: %w", err)
	}

	transfer.State = StateComplete
	transfer.EndTime = time.Now()
	transfer.Checksum = checksum

	return nil
}

// CancelTransfer cancels a transfer
func (m *Manager) CancelTransfer(id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	transfer, exists := m.transfers[id]
	if !exists {
		return fmt.Errorf("transfer not found: %s", id)
	}

	transfer.cancel()
	transfer.State = StateFailed
	transfer.Error = "cancelled"
	transfer.EndTime = time.Now()

	// Cleanup file
	if err := os.Remove(transfer.DestPath); err != nil {
		m.logger.Error("Failed to remove cancelled transfer",
			zap.String("id", id),
			zap.Error(err))
	}

	return nil
}

// GetTransfer returns transfer status
func (m *Manager) GetTransfer(id string) (*Transfer, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	transfer, exists := m.transfers[id]
	if !exists {
		return nil, fmt.Errorf("transfer not found: %s", id)
	}

	return transfer, nil
}

// calculateChecksum calculates SHA-256 checksum of a file
func (m *Manager) calculateChecksum(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", fmt.Errorf("failed to open file: %w", err)
	}
	defer f.Close()

	hash := sha256.New()
	if _, err := io.Copy(hash, f); err != nil {
		return "", fmt.Errorf("failed to calculate hash: %w", err)
	}

	return hex.EncodeToString(hash.Sum(nil)), nil
}

// Cleanup removes old transfers
func (m *Manager) Cleanup(maxAge time.Duration) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now()
	for id, transfer := range m.transfers {
		if transfer.EndTime.IsZero() {
			continue
		}

		if now.Sub(transfer.EndTime) > maxAge {
			if err := os.Remove(transfer.DestPath); err != nil && !os.IsNotExist(err) {
				m.logger.Error("Failed to remove old transfer",
					zap.String("id", id),
					zap.Error(err))
			}
			delete(m.transfers, id)
		}
	}

	return nil
}

// Start begins the transfer manager
func (m *Manager) Start(ctx context.Context) error {
	// Start cleanup routine
	go func() {
		ticker := time.NewTicker(6 * time.Hour)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if err := m.Cleanup(24 * time.Hour); err != nil {
					m.logger.Error("Failed to cleanup transfers", zap.Error(err))
				}
			}
		}
	}()

	return nil
}

// Shutdown stops the transfer manager
func (m *Manager) Shutdown() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Cancel all active transfers
	for id, transfer := range m.transfers {
		if transfer.State == StateTransferring || transfer.State == StateStarting {
			transfer.cancel()
			transfer.State = StateFailed
			transfer.Error = "shutdown"
			transfer.EndTime = time.Now()
			m.logger.Info("Transfer cancelled due to shutdown",
				zap.String("id", id),
				zap.String("state", string(transfer.State)))
		}
	}

	return nil
}
