package integration

import (
	"context"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

// TestHelper provides test utilities
type TestHelper struct {
	t      *testing.T
	tmpDir string
}

// NewTestHelper creates a new test helper
func NewTestHelper(t *testing.T) *TestHelper {
	tmpDir, err := os.MkdirTemp("", "shh-test-*")
	require.NoError(t, err, "Failed to create temp directory")

	return &TestHelper{
		t:      t,
		tmpDir: tmpDir,
	}
}

// TempDir returns the test temp directory
func (h *TestHelper) TempDir() string {
	return h.tmpDir
}

// CreateTempFile creates a temporary file
func (h *TestHelper) CreateTempFile(name, content string) string {
	path := filepath.Join(h.tmpDir, name)
	err := os.WriteFile(path, []byte(content), 0644)
	require.NoError(h.t, err, "Failed to create temp file")
	return path
}

// CreateTempDir creates a temporary directory
func (h *TestHelper) CreateTempDir(name string) string {
	path := filepath.Join(h.tmpDir, name)
	err := os.MkdirAll(path, 0755)
	require.NoError(h.t, err, "Failed to create temp directory")
	return path
}

// WaitForPort waits for a port to be available
func (h *TestHelper) WaitForPort(port int, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		conn, err := net.DialTimeout("tcp", fmt.Sprintf("localhost:%d", port), time.Second)
		if err == nil {
			conn.Close()
			return nil
		}
		time.Sleep(100 * time.Millisecond)
	}
	return fmt.Errorf("port %d not available after %s", port, timeout)
}

// WaitForFile waits for a file to exist
func (h *TestHelper) WaitForFile(path string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if _, err := os.Stat(path); err == nil {
			return nil
		}
		time.Sleep(100 * time.Millisecond)
	}
	return fmt.Errorf("file %s not found after %s", path, timeout)
}

// WaitForCondition waits for a condition to be true
func (h *TestHelper) WaitForCondition(condition func() bool, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if condition() {
			return nil
		}
		time.Sleep(100 * time.Millisecond)
	}
	return fmt.Errorf("condition not met after %s", timeout)
}

// RunWithTimeout runs a function with timeout
func (h *TestHelper) RunWithTimeout(timeout time.Duration, fn func(context.Context) error) error {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	return fn(ctx)
}

// AssertEventually asserts that a condition becomes true
func (h *TestHelper) AssertEventually(condition func() bool, timeout time.Duration, message string) {
	err := h.WaitForCondition(condition, timeout)
	require.NoError(h.t, err, message)
}

// AssertNever asserts that a condition never becomes true
func (h *TestHelper) AssertNever(condition func() bool, duration time.Duration, message string) {
	deadline := time.Now().Add(duration)
	for time.Now().Before(deadline) {
		require.False(h.t, condition(), message)
		time.Sleep(100 * time.Millisecond)
	}
}

// Cleanup cleans up test resources
func (h *TestHelper) Cleanup() {
	if h.tmpDir != "" {
		os.RemoveAll(h.tmpDir)
	}
}

// CreateTestConfig creates a test configuration
func (h *TestHelper) CreateTestConfig() string {
	config := `
logging:
  level: debug
  path: logs/test.log
  max_size: 10
  max_age: 7
  max_backups: 3
  compress: true

backup:
  path: backups
  retention: 7
  schedule: "*/5 * * * *"
  compress: true
  encrypt: true

security:
  scan_interval: 3600
  rules:
    - type: permission
      target: /
      severity: high
      remediate: true
    - type: network
      target: "*"
      severity: medium
      remediate: false

network:
  interface: lo
  promiscuous: true
  bpf_filter: ""
  snap_len: 65535

optimizer:
  disk_threshold: 90
  mem_threshold: 85
  cpu_threshold: 80
  cleanup_age: 30

resolver:
  patterns:
    - pattern: ".*Error.*"
      action: "restart_service"
    - pattern: ".*Warning.*"
      action: "log_warning"

discovery:
  scan_interval: 300
  port_range: "1-65535"
  timeout: 5
`
	return h.CreateTempFile("config.yaml", config)
}

// CreateTestData creates test data files
func (h *TestHelper) CreateTestData() string {
	dataDir := h.CreateTempDir("data")

	// Create some test files
	files := map[string]string{
		"test1.txt": "This is test file 1\n",
		"test2.txt": "This is test file 2\n",
		"test3.txt": "This is test file 3\n",
	}

	for name, content := range files {
		path := filepath.Join(dataDir, name)
		err := os.WriteFile(path, []byte(content), 0644)
		require.NoError(h.t, err, "Failed to create test file")
	}

	// Create some subdirectories
	dirs := []string{"dir1", "dir2", "dir3"}
	for _, dir := range dirs {
		path := filepath.Join(dataDir, dir)
		err := os.MkdirAll(path, 0755)
		require.NoError(h.t, err, "Failed to create test directory")
	}

	return dataDir
}

// CreateTestLogs creates test log files
func (h *TestHelper) CreateTestLogs() string {
	logsDir := h.CreateTempDir("logs")

	// Create some test log files
	logs := map[string]string{
		"app.log": `
2023-01-01 12:00:00 INFO Starting application
2023-01-01 12:00:01 DEBUG Initializing components
2023-01-01 12:00:02 ERROR Failed to connect to database
2023-01-01 12:00:03 WARNING High memory usage
2023-01-01 12:00:04 INFO Application started
`,
		"error.log": `
2023-01-01 12:00:00 ERROR Database connection failed
2023-01-01 12:00:01 ERROR Network timeout
2023-01-01 12:00:02 ERROR Disk full
`,
		"access.log": `
2023-01-01 12:00:00 GET /api/v1/status 200
2023-01-01 12:00:01 POST /api/v1/users 201
2023-01-01 12:00:02 GET /api/v1/health 200
`,
	}

	for name, content := range logs {
		path := filepath.Join(logsDir, name)
		err := os.WriteFile(path, []byte(content), 0644)
		require.NoError(h.t, err, "Failed to create test log")
	}

	return logsDir
}

// CreateTestBackups creates test backup files
func (h *TestHelper) CreateTestBackups() string {
	backupsDir := h.CreateTempDir("backups")

	// Create some test backup files
	backups := []string{
		"backup_2023_01_01.tar.gz",
		"backup_2023_01_02.tar.gz",
		"backup_2023_01_03.tar.gz",
	}

	for _, name := range backups {
		path := filepath.Join(backupsDir, name)
		err := os.WriteFile(path, []byte("mock backup data"), 0644)
		require.NoError(h.t, err, "Failed to create test backup")
	}

	return backupsDir
}

// SetupTestEnvironment sets up a complete test environment
func (h *TestHelper) SetupTestEnvironment() TestEnvironment {
	return TestEnvironment{
		ConfigPath:  h.CreateTestConfig(),
		DataDir:     h.CreateTestData(),
		LogsDir:     h.CreateTestLogs(),
		BackupsDir:  h.CreateTestBackups(),
		TempDir:     h.tmpDir,
	}
}

// TestEnvironment represents a complete test environment
type TestEnvironment struct {
	ConfigPath  string
	DataDir     string
	LogsDir     string
	BackupsDir  string
	TempDir     string
}
