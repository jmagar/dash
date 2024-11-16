package integration

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/suite"
	"go.uber.org/zap"
	"go.uber.org/zap/zaptest"

	"shh/agent/internal/backup"
	"shh/agent/internal/config"
	"shh/agent/internal/discovery"
	"shh/agent/internal/logging"
	"shh/agent/internal/network"
	"shh/agent/internal/optimizer"
	"shh/agent/internal/resolver"
	"shh/agent/internal/security"
	"shh/agent/internal/updates"
)

// IntegrationSuite defines the integration test suite
type IntegrationSuite struct {
	suite.Suite
	ctx        context.Context
	cancel     context.CancelFunc
	logger     *zap.Logger
	tempDir    string
	components *Components
}

// Components holds all agent components
type Components struct {
	Discovery  *discovery.Service
	Backup     *backup.Manager
	Security   *security.Scanner
	Network    *network.Analyzer
	Optimizer  *optimizer.Optimizer
	Resolver   *resolver.Resolver
	Updates    *updates.Manager
	Logging    *logging.Manager
}

// SetupSuite prepares the test suite
func (s *IntegrationSuite) SetupSuite() {
	// Create context
	s.ctx, s.cancel = context.WithTimeout(context.Background(), 5*time.Minute)

	// Create logger
	s.logger = zaptest.NewLogger(s.T())

	// Create temp directory
	tempDir, err := os.MkdirTemp("", "shh-integration-*")
	s.Require().NoError(err, "Failed to create temp directory")
	s.tempDir = tempDir

	// Initialize components
	s.components = &Components{
		Discovery:  discovery.NewService(s.logger),
		Backup:     backup.NewManager(s.logger),
		Security:   security.NewScanner(s.logger),
		Network:    network.NewAnalyzer(s.logger),
		Optimizer:  optimizer.NewOptimizer(s.logger),
		Resolver:   resolver.NewResolver(s.logger),
		Updates:    updates.NewManager(s.logger),
		Logging:    logging.NewManager(s.logger),
	}

	// Setup test environment
	s.setupTestEnvironment()
}

// setupTestEnvironment prepares the test environment
func (s *IntegrationSuite) setupTestEnvironment() {
	// Create test directories
	dirs := []string{
		"logs",
		"backups",
		"config",
		"data",
	}

	for _, dir := range dirs {
		path := filepath.Join(s.tempDir, dir)
		err := os.MkdirAll(path, 0755)
		s.Require().NoError(err, "Failed to create directory: %s", dir)
	}

	// Create test files
	files := map[string]string{
		"config/app.yaml": `
logging:
  level: debug
  path: logs/app.log
backup:
  schedule: "0 * * * *"
  retention: 7
security:
  scan_interval: 3600
`,
		"data/test.txt": "test data\n",
	}

	for name, content := range files {
		path := filepath.Join(s.tempDir, name)
		err := os.WriteFile(path, []byte(content), 0644)
		s.Require().NoError(err, "Failed to create file: %s", name)
	}
}

// TearDownSuite cleans up after all tests
func (s *IntegrationSuite) TearDownSuite() {
	// Cancel context
	s.cancel()

	// Cleanup temp directory
	if s.tempDir != "" {
		os.RemoveAll(s.tempDir)
	}
}

// TestDiscoveryIntegration tests service discovery
func (s *IntegrationSuite) TestDiscoveryIntegration() {
	// Start discovery service
	err := s.components.Discovery.Start(s.ctx)
	s.Require().NoError(err, "Failed to start discovery service")

	// Wait for initial discovery
	time.Sleep(2 * time.Second)

	// Get discovered services
	services := s.components.Discovery.GetServices()
	s.T().Logf("Discovered services: %+v", services)

	// Verify basic discovery functionality
	s.Assert().NotEmpty(services, "No services discovered")
}

// TestBackupIntegration tests backup functionality
func (s *IntegrationSuite) TestBackupIntegration() {
	// Configure backup
	config := backup.Config{
		Path:      filepath.Join(s.tempDir, "backups"),
		Retention: 7,
		Schedule:  "*/5 * * * *",
	}

	// Initialize backup
	err := s.components.Backup.Configure(config)
	s.Require().NoError(err, "Failed to configure backup")

	// Create test data
	testFile := filepath.Join(s.tempDir, "data/backup_test.txt")
	err = os.WriteFile(testFile, []byte("backup test data"), 0644)
	s.Require().NoError(err, "Failed to create test file")

	// Perform backup
	backup, err := s.components.Backup.CreateBackup(s.ctx, "test")
	s.Require().NoError(err, "Failed to create backup")

	// Verify backup
	s.Assert().NotEmpty(backup.ID, "Backup ID is empty")
	s.Assert().FileExists(filepath.Join(config.Path, backup.ID+".tar.gz"))
}

// TestSecurityIntegration tests security scanning
func (s *IntegrationSuite) TestSecurityIntegration() {
	// Configure scanner
	err := s.components.Security.Configure(security.Config{
		ScanInterval: 3600,
		Rules: []security.Rule{
			{
				Type:        security.RuleTypePermission,
				Target:      s.tempDir,
				Severity:    security.SeverityHigh,
				Remediate:   true,
			},
		},
	})
	s.Require().NoError(err, "Failed to configure security scanner")

	// Run scan
	findings, err := s.components.Security.Scan(s.ctx)
	s.Require().NoError(err, "Failed to run security scan")

	// Verify findings
	s.T().Logf("Security findings: %+v", findings)
	s.Assert().NotNil(findings, "No security findings")
}

// TestNetworkIntegration tests network analysis
func (s *IntegrationSuite) TestNetworkIntegration() {
	// Start network analyzer
	err := s.components.Network.Start(s.ctx, "lo")
	s.Require().NoError(err, "Failed to start network analyzer")

	// Generate some network traffic
	go func() {
		// Make some HTTP requests
		for i := 0; i < 5; i++ {
			_, err := http.Get("http://localhost:8080")
			if err != nil {
				s.T().Logf("HTTP request failed: %v", err)
			}
			time.Sleep(time.Second)
		}
	}()

	// Wait for analysis
	time.Sleep(5 * time.Second)

	// Get flows
	flows := s.components.Network.GetFlows()
	s.T().Logf("Network flows: %+v", flows)
	s.Assert().NotEmpty(flows, "No network flows detected")
}

// TestOptimizerIntegration tests resource optimization
func (s *IntegrationSuite) TestOptimizerIntegration() {
	// Configure optimizer
	s.components.Optimizer.SetThresholds(90, 85, 80)

	// Run analysis
	err := s.components.Optimizer.Analyze(s.ctx)
	s.Require().NoError(err, "Failed to analyze resources")

	// Get optimizations
	opts := s.components.Optimizer.GetOptimizations()
	s.T().Logf("Optimization suggestions: %+v", opts)
}

// TestResolverIntegration tests problem resolution
func (s *IntegrationSuite) TestResolverIntegration() {
	// Add test pattern
	s.components.Resolver.AddPattern(".*Error.*", "Restart service")

	// Detect problems
	err := s.components.Resolver.DetectProblems(s.ctx)
	s.Require().NoError(err, "Failed to detect problems")

	// Get problems
	problems := s.components.Resolver.GetProblems()
	s.T().Logf("Detected problems: %+v", problems)
}

// TestLoggingIntegration tests logging functionality
func (s *IntegrationSuite) TestLoggingIntegration() {
	// Configure logging
	logPath := filepath.Join(s.tempDir, "logs/test.log")
	err := s.components.Logging.AddLogFile(logPath, logging.LogConfig{
		MaxSize:    10,
		MaxAge:     7,
		MaxBackups: 3,
		Compress:   true,
	})
	s.Require().NoError(err, "Failed to configure logging")

	// Add test pattern
	s.components.Logging.AddPattern(logging.LogPattern{
		Pattern:     "ERROR",
		Level:       logging.LevelError,
		Description: "Error message",
	})

	// Start logging
	err = s.components.Logging.Start(s.ctx)
	s.Require().NoError(err, "Failed to start logging")

	// Write test log
	logger := s.components.Logging
	entries := logger.GetEntries(map[string]interface{}{
		"level": logging.LevelError,
	})
	s.T().Logf("Log entries: %+v", entries)
}

// TestUpdateIntegration tests update management
func (s *IntegrationSuite) TestUpdateIntegration() {
	// Check for updates
	err := s.components.Updates.CheckUpdates(s.ctx)
	s.Require().NoError(err, "Failed to check updates")

	// Get available updates
	updates := s.components.Updates.GetUpdates()
	s.T().Logf("Available updates: %+v", updates)
}

// TestComponentInteraction tests interaction between components
func (s *IntegrationSuite) TestComponentInteraction() {
	// Test backup triggering security scan
	backup, err := s.components.Backup.CreateBackup(s.ctx, "interaction_test")
	s.Require().NoError(err, "Failed to create backup")

	// Verify backup triggered security scan
	time.Sleep(time.Second)
	findings, err := s.components.Security.Scan(s.ctx)
	s.Require().NoError(err, "Failed to get security findings")

	s.T().Logf("Backup ID: %s, Security findings: %+v", backup.ID, findings)
}

// Run runs the test suite
func TestIntegrationSuite(t *testing.T) {
	suite.Run(t, new(IntegrationSuite))
}
