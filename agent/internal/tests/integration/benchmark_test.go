package integration

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"go.uber.org/zap"

	"shh/agent/internal/backup"
	"shh/agent/internal/security"
)

func BenchmarkBackup(b *testing.B) {
	logger, err := zap.NewDevelopment()
	if err != nil {
		b.Fatal(err)
	}

	// Create temp directory for tests
	tempDir, err := os.MkdirTemp("", "benchmark_test_*")
	if err != nil {
		b.Fatal(err)
	}
	defer os.RemoveAll(tempDir)

	// Initialize backup manager
	backupConfig := &backup.BackupConfig{
		Path:      filepath.Join(tempDir, "backups"),
		Compress:  true,
		Encrypt:   false,
		MaxSize:   1024 * 1024 * 100, // 100MB
	}
	backupManager, err := backup.NewManager(backupConfig, logger)
	if err != nil {
		b.Fatal(err)
	}

	// Create test data
	testDir := filepath.Join(tempDir, "test_data")
	err = os.MkdirAll(testDir, 0755)
	if err != nil {
		b.Fatal(err)
	}

	testFile := filepath.Join(testDir, "test.txt")
	err = os.WriteFile(testFile, []byte("test data"), 0644)
	if err != nil {
		b.Fatal(err)
	}

	ctx := context.Background()

	// Run benchmark
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		err := backupManager.CreateBackup(ctx, testDir)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkSecurity(b *testing.B) {
	logger, err := zap.NewDevelopment()
	if err != nil {
		b.Fatal(err)
	}

	// Create temp directory for tests
	tempDir, err := os.MkdirTemp("", "benchmark_test_*")
	if err != nil {
		b.Fatal(err)
	}
	defer os.RemoveAll(tempDir)

	// Initialize security scanner
	scanner := security.NewScanner(logger)

	// Create test file
	testFile := filepath.Join(tempDir, "test.sh")
	err = os.WriteFile(testFile, []byte("#!/bin/sh\necho 'test'"), 0644)
	if err != nil {
		b.Fatal(err)
	}

	// Configure scanner
	config := security.ScanConfig{
		Paths: []string{tempDir},
		Rules: []security.Rule{
			{
				Type:       security.RuleTypePermission,
				Target:     "**/*.sh",
				Permission: 0755,
			},
		},
	}
	scanner.Configure(config)

	ctx := context.Background()

	// Run benchmark
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := scanner.Scan(ctx, config)
		if err != nil {
			b.Fatal(err)
		}
	}
}
