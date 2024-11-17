package files

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/bmatcuk/doublestar/v4"
	"go.uber.org/zap"
)

// FileInfo represents file information
type FileInfo struct {
	Path         string      `json:"path"`
	Name         string      `json:"name"`
	Size         int64       `json:"size"`
	Mode         fs.FileMode `json:"mode"`
	ModTime      time.Time   `json:"mod_time"`
	IsDir        bool        `json:"is_dir"`
	SymlinkPath  string      `json:"symlink_path,omitempty"`
	ContentType  string      `json:"content_type,omitempty"`
	Checksum     string      `json:"checksum,omitempty"`
	Owner        string      `json:"owner"`
	Group        string      `json:"group"`
	Permissions  string      `json:"permissions"`
	Children     []FileInfo  `json:"children,omitempty"`
	Hidden       bool        `json:"hidden"`
}

// SearchResult represents a file search result
type SearchResult struct {
	Path       string    `json:"path"`
	Name       string    `json:"name"`
	Size       int64     `json:"size"`
	ModTime    time.Time `json:"mod_time"`
	IsDir      bool      `json:"is_dir"`
	MatchScore float64   `json:"match_score"`
}

// Manager manages file operations
type Manager struct {
	logger     *zap.Logger
	maxResults int
	mu         sync.RWMutex
	cache      map[string]*FileInfo
}

// NewManager creates a new file manager
func NewManager(logger *zap.Logger) *Manager {
	return &Manager{
		logger:     logger,
		maxResults: 1000,
		cache:      make(map[string]*FileInfo),
	}
}

// List lists directory contents
func (m *Manager) List(path string, recursive bool) ([]FileInfo, error) {
	// Get absolute path
	absPath, err := filepath.Abs(path)
	if err != nil {
		return nil, fmt.Errorf("failed to get absolute path: %w", err)
	}

	// Check if path exists
	info, err := os.Lstat(absPath)
	if err != nil {
		return nil, fmt.Errorf("failed to stat path: %w", err)
	}

	// If it's a file, return its info
	if !info.IsDir() {
		fileInfo, err := m.getFileInfo(absPath, info)
		if err != nil {
			return nil, err
		}
		return []FileInfo{*fileInfo}, nil
	}

	// List directory
	var files []FileInfo
	err = filepath.WalkDir(absPath, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			m.logger.Debug("Error accessing path",
				zap.String("path", path),
				zap.Error(err))
			return nil
		}

		// Skip root if recursive
		if path == absPath && recursive {
			return nil
		}

		// Get file info
		info, err := d.Info()
		if err != nil {
			m.logger.Debug("Error getting file info",
				zap.String("path", path),
				zap.Error(err))
			return nil
		}

		fileInfo, err := m.getFileInfo(path, info)
		if err != nil {
			m.logger.Debug("Error getting detailed file info",
				zap.String("path", path),
				zap.Error(err))
			return nil
		}

		files = append(files, *fileInfo)

		// Skip directory contents if not recursive
		if !recursive && d.IsDir() && path != absPath {
			return filepath.SkipDir
		}

		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to walk directory: %w", err)
	}

	return files, nil
}

// Search searches for files
func (m *Manager) Search(root string, pattern string, maxResults int) ([]SearchResult, error) {
	if maxResults <= 0 {
		maxResults = m.maxResults
	}

	var results []SearchResult
	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			m.logger.Debug("Error accessing path",
				zap.String("path", path),
				zap.Error(err))
			return nil
		}

		// Check if we've reached max results
		if len(results) >= maxResults {
			return filepath.SkipDir
		}

		// Match pattern
		match, err := doublestar.Match(pattern, path)
		if err != nil {
			return nil
		}

		if match {
			info, err := d.Info()
			if err != nil {
				return nil
			}

			results = append(results, SearchResult{
				Path:    path,
				Name:    info.Name(),
				Size:    info.Size(),
				ModTime: info.ModTime(),
				IsDir:   info.IsDir(),
			})
		}

		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to search: %w", err)
	}

	return results, nil
}

// Copy copies a file or directory
func (m *Manager) Copy(src, dst string) error {
	// Get source info
	srcInfo, err := os.Lstat(src)
	if err != nil {
		return fmt.Errorf("failed to stat source: %w", err)
	}

	// Handle symlinks
	if srcInfo.Mode()&os.ModeSymlink != 0 {
		return m.copySymlink(src, dst)
	}

	if !srcInfo.IsDir() {
		return m.copyFile(src, dst)
	}

	return m.copyDir(src, dst)
}

// Move moves a file or directory
func (m *Manager) Move(src, dst string) error {
	if err := m.Copy(src, dst); err != nil {
		return err
	}
	return os.RemoveAll(src)
}

// Delete deletes a file or directory
func (m *Manager) Delete(path string) error {
	return os.RemoveAll(path)
}

// Checksum calculates file checksum
func (m *Manager) Checksum(path string) (string, error) {
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

// getFileInfo gets detailed file information
func (m *Manager) getFileInfo(path string, info fs.FileInfo) (*FileInfo, error) {
	fileInfo := &FileInfo{
		Path:    path,
		Name:    info.Name(),
		Size:    info.Size(),
		Mode:    info.Mode(),
		ModTime: info.ModTime(),
		IsDir:   info.IsDir(),
		Hidden:  strings.HasPrefix(info.Name(), "."),
	}

	// Handle symlinks
	if info.Mode()&os.ModeSymlink != 0 {
		target, err := os.Readlink(path)
		if err != nil {
			return nil, fmt.Errorf("failed to read symlink: %w", err)
		}
		fileInfo.SymlinkPath = target
	}

	// Get content type for regular files
	if info.Mode().IsRegular() {
		f, err := os.Open(path)
		if err == nil {
			defer f.Close()
			buffer := make([]byte, 512)
			n, err := f.Read(buffer)
			if err == nil {
				fileInfo.ContentType = http.DetectContentType(buffer[:n])
			}
		}
	}

	return fileInfo, nil
}

// copyFile copies a single file
func (m *Manager) copyFile(src, dst string) error {
	source, err := os.Open(src)
	if err != nil {
		return fmt.Errorf("failed to open source: %w", err)
	}
	defer source.Close()

	// Create destination directory if it doesn't exist
	if err := os.MkdirAll(filepath.Dir(dst), 0755); err != nil {
		return fmt.Errorf("failed to create destination directory: %w", err)
	}

	destination, err := os.Create(dst)
	if err != nil {
		return fmt.Errorf("failed to create destination: %w", err)
	}
	defer destination.Close()

	if _, err := io.Copy(destination, source); err != nil {
		return fmt.Errorf("failed to copy: %w", err)
	}

	sourceInfo, err := os.Stat(src)
	if err != nil {
		return fmt.Errorf("failed to stat source: %w", err)
	}

	return os.Chmod(dst, sourceInfo.Mode())
}

// copyDir copies a directory recursively
func (m *Manager) copyDir(src, dst string) error {
	srcInfo, err := os.Stat(src)
	if err != nil {
		return fmt.Errorf("failed to stat source: %w", err)
	}

	if err := os.MkdirAll(dst, srcInfo.Mode()); err != nil {
		return fmt.Errorf("failed to create destination directory: %w", err)
	}

	entries, err := os.ReadDir(src)
	if err != nil {
		return fmt.Errorf("failed to read directory: %w", err)
	}

	for _, entry := range entries {
		srcPath := filepath.Join(src, entry.Name())
		dstPath := filepath.Join(dst, entry.Name())

		if entry.IsDir() {
			if err := m.copyDir(srcPath, dstPath); err != nil {
				return err
			}
		} else {
			if err := m.copyFile(srcPath, dstPath); err != nil {
				return err
			}
		}
	}

	return nil
}

// copySymlink copies a symbolic link
func (m *Manager) copySymlink(src, dst string) error {
	target, err := os.Readlink(src)
	if err != nil {
		return fmt.Errorf("failed to read symlink: %w", err)
	}

	if err := os.MkdirAll(filepath.Dir(dst), 0755); err != nil {
		return fmt.Errorf("failed to create destination directory: %w", err)
	}

	return os.Symlink(target, dst)
}
