package integration

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/suite"
	"go.uber.org/zap"

	"shh/agent/internal/backup"
	"shh/agent/internal/security"
)

type IntegrationSuite struct {
	suite.Suite
	logger     *zap.Logger
	components struct {
		Backup   *backup.Manager
		Security *security.Scanner
	}
	tempDir string
}

func (s *IntegrationSuite) SetupSuite() {
	var err error
	s.logger, err = zap.NewDevelopment()
	s.Require().NoError(err)

	// Create temp directory for tests
	s.tempDir, err = os.MkdirTemp("", "integration_test_*")
	s.Require().NoError(err)

	// Initialize components
	s.initializeComponents()
}

func (s *IntegrationSuite) TearDownSuite() {
	os.RemoveAll(s.tempDir)
	s.logger.Sync()
}

func (s *IntegrationSuite) initializeComponents() {
	var err error

	// Initialize backup manager
	backupConfig := &backup.BackupConfig{
		Path:      filepath.Join(s.tempDir, "backups"),
		Interval:  time.Hour,
		Compress:  true,
		Encrypt:   false,
		MaxAge:    24 * time.Hour,
		MaxSize:   1024 * 1024 * 100, // 100MB
		Retention: 7 * 24 * time.Hour,
	}
	s.components.Backup, err = backup.NewManager(backupConfig, s.logger)
	s.Require().NoError(err)

	// Initialize security scanner
	s.components.Security = security.NewScanner(s.logger)
}

func (s *IntegrationSuite) TestBackupManager() {
	ctx := context.Background()

	// Create test data
	testDir := filepath.Join(s.tempDir, "test_data")
	err := os.MkdirAll(testDir, 0755)
	s.Require().NoError(err)

	testFile := filepath.Join(testDir, "test.txt")
	err = os.WriteFile(testFile, []byte("test data"), 0644)
	s.Require().NoError(err)

	// Create backup
	err = s.components.Backup.CreateBackup(ctx, testDir)
	s.Require().NoError(err)

	// List backups
	backups, err := s.components.Backup.ListBackups()
	s.Require().NoError(err)
	s.Require().Len(backups, 1)

	// Restore backup
	restoreDir := filepath.Join(s.tempDir, "restored")
	err = s.components.Backup.RestoreBackup(ctx, backups[0], restoreDir)
	s.Require().NoError(err)

	// Verify restored data
	restoredFile := filepath.Join(restoreDir, "test_data", "test.txt")
	data, err := os.ReadFile(restoredFile)
	s.Require().NoError(err)
	s.Equal("test data", string(data))
}

func (s *IntegrationSuite) TestSecurityScanner() {
	ctx := context.Background()

	// Configure security scanner
	config := security.ScanConfig{
		Rules: []security.Rule{
			{
				Type:        security.RuleTypePermission,
				Target:      "**/*.sh",
				Permission: 0755,
			},
		},
	}
	s.components.Security.Configure(config)

	// Create test file
	testFile := filepath.Join(s.tempDir, "test.sh")
	err := os.WriteFile(testFile, []byte("#!/bin/sh\necho 'test'"), 0644)
	s.Require().NoError(err)

	// Run security scan
	results, err := s.components.Security.Scan(ctx, security.ScanConfig{
		Paths: []string{s.tempDir},
	})
	s.Require().NoError(err)
	s.Require().NotEmpty(results)
}

func TestIntegrationSuite(t *testing.T) {
	suite.Run(t, new(IntegrationSuite))
}
