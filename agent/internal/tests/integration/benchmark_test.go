package integration

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

// BenchmarkDiscovery benchmarks service discovery
func BenchmarkDiscovery(b *testing.B) {
	helper := NewTestHelper(b)
	defer helper.Cleanup()

	env := helper.SetupTestEnvironment()
	ctx := context.Background()

	suite := new(IntegrationSuite)
	suite.SetT(b)
	suite.SetupSuite()
	defer suite.TearDownSuite()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		err := suite.components.Discovery.Start(ctx)
		require.NoError(b, err)
		services := suite.components.Discovery.GetServices()
		require.NotEmpty(b, services)
	}
}

// BenchmarkBackup benchmarks backup operations
func BenchmarkBackup(b *testing.B) {
	helper := NewTestHelper(b)
	defer helper.Cleanup()

	env := helper.SetupTestEnvironment()
	ctx := context.Background()

	suite := new(IntegrationSuite)
	suite.SetT(b)
	suite.SetupSuite()
	defer suite.TearDownSuite()

	config := backup.Config{
		Path:      env.BackupsDir,
		Retention: 7,
		Schedule:  "*/5 * * * *",
	}

	err := suite.components.Backup.Configure(config)
	require.NoError(b, err)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		backup, err := suite.components.Backup.CreateBackup(ctx, "benchmark")
		require.NoError(b, err)
		require.NotEmpty(b, backup.ID)
	}
}

// BenchmarkSecurity benchmarks security scanning
func BenchmarkSecurity(b *testing.B) {
	helper := NewTestHelper(b)
	defer helper.Cleanup()

	env := helper.SetupTestEnvironment()
	ctx := context.Background()

	suite := new(IntegrationSuite)
	suite.SetT(b)
	suite.SetupSuite()
	defer suite.TearDownSuite()

	err := suite.components.Security.Configure(security.Config{
		ScanInterval: 3600,
		Rules: []security.Rule{
			{
				Type:      security.RuleTypePermission,
				Target:    env.DataDir,
				Severity:  security.SeverityHigh,
				Remediate: true,
			},
		},
	})
	require.NoError(b, err)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		findings, err := suite.components.Security.Scan(ctx)
		require.NoError(b, err)
		require.NotNil(b, findings)
	}
}

// BenchmarkNetwork benchmarks network analysis
func BenchmarkNetwork(b *testing.B) {
	helper := NewTestHelper(b)
	defer helper.Cleanup()

	ctx := context.Background()

	suite := new(IntegrationSuite)
	suite.SetT(b)
	suite.SetupSuite()
	defer suite.TearDownSuite()

	err := suite.components.Network.Start(ctx, "lo")
	require.NoError(b, err)

	// Generate network traffic
	mockService := NewMockService()
	defer mockService.Close()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		flows := suite.components.Network.GetFlows()
		require.NotNil(b, flows)
	}
}

// BenchmarkOptimizer benchmarks resource optimization
func BenchmarkOptimizer(b *testing.B) {
	helper := NewTestHelper(b)
	defer helper.Cleanup()

	ctx := context.Background()

	suite := new(IntegrationSuite)
	suite.SetT(b)
	suite.SetupSuite()
	defer suite.TearDownSuite()

	suite.components.Optimizer.SetThresholds(90, 85, 80)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		err := suite.components.Optimizer.Analyze(ctx)
		require.NoError(b, err)
		opts := suite.components.Optimizer.GetOptimizations()
		require.NotNil(b, opts)
	}
}

// BenchmarkResolver benchmarks problem resolution
func BenchmarkResolver(b *testing.B) {
	helper := NewTestHelper(b)
	defer helper.Cleanup()

	ctx := context.Background()

	suite := new(IntegrationSuite)
	suite.SetT(b)
	suite.SetupSuite()
	defer suite.TearDownSuite()

	suite.components.Resolver.AddPattern(".*Error.*", "Restart service")

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		err := suite.components.Resolver.DetectProblems(ctx)
		require.NoError(b, err)
		problems := suite.components.Resolver.GetProblems()
		require.NotNil(b, problems)
	}
}

// BenchmarkLogging benchmarks logging operations
func BenchmarkLogging(b *testing.B) {
	helper := NewTestHelper(b)
	defer helper.Cleanup()

	env := helper.SetupTestEnvironment()
	ctx := context.Background()

	suite := new(IntegrationSuite)
	suite.SetT(b)
	suite.SetupSuite()
	defer suite.TearDownSuite()

	err := suite.components.Logging.AddLogFile(env.LogsDir+"/bench.log", logging.LogConfig{
		MaxSize:    10,
		MaxAge:     7,
		MaxBackups: 3,
		Compress:   true,
	})
	require.NoError(b, err)

	suite.components.Logging.AddPattern(logging.LogPattern{
		Pattern:     "ERROR",
		Level:       logging.LevelError,
		Description: "Error message",
	})

	err = suite.components.Logging.Start(ctx)
	require.NoError(b, err)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		entries := suite.components.Logging.GetEntries(map[string]interface{}{
			"level": logging.LevelError,
		})
		require.NotNil(b, entries)
	}
}

// BenchmarkUpdates benchmarks update operations
func BenchmarkUpdates(b *testing.B) {
	helper := NewTestHelper(b)
	defer helper.Cleanup()

	ctx := context.Background()

	suite := new(IntegrationSuite)
	suite.SetT(b)
	suite.SetupSuite()
	defer suite.TearDownSuite()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		err := suite.components.Updates.CheckUpdates(ctx)
		require.NoError(b, err)
		updates := suite.components.Updates.GetUpdates()
		require.NotNil(b, updates)
	}
}

// BenchmarkComponentInteraction benchmarks component interactions
func BenchmarkComponentInteraction(b *testing.B) {
	helper := NewTestHelper(b)
	defer helper.Cleanup()

	env := helper.SetupTestEnvironment()
	ctx := context.Background()

	suite := new(IntegrationSuite)
	suite.SetT(b)
	suite.SetupSuite()
	defer suite.TearDownSuite()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		// Create backup
		backup, err := suite.components.Backup.CreateBackup(ctx, "interaction_test")
		require.NoError(b, err)
		require.NotEmpty(b, backup.ID)

		// Run security scan
		findings, err := suite.components.Security.Scan(ctx)
		require.NoError(b, err)
		require.NotNil(b, findings)

		// Check network flows
		flows := suite.components.Network.GetFlows()
		require.NotNil(b, flows)

		// Run optimization
		err = suite.components.Optimizer.Analyze(ctx)
		require.NoError(b, err)
		opts := suite.components.Optimizer.GetOptimizations()
		require.NotNil(b, opts)
	}
}

// BenchmarkConcurrentOperations benchmarks concurrent operations
func BenchmarkConcurrentOperations(b *testing.B) {
	helper := NewTestHelper(b)
	defer helper.Cleanup()

	env := helper.SetupTestEnvironment()
	ctx := context.Background()

	suite := new(IntegrationSuite)
	suite.SetT(b)
	suite.SetupSuite()
	defer suite.TearDownSuite()

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			// Run multiple operations concurrently
			done := make(chan bool)

			// Backup operation
			go func() {
				backup, err := suite.components.Backup.CreateBackup(ctx, "concurrent_test")
				require.NoError(b, err)
				require.NotEmpty(b, backup.ID)
				done <- true
			}()

			// Security scan operation
			go func() {
				findings, err := suite.components.Security.Scan(ctx)
				require.NoError(b, err)
				require.NotNil(b, findings)
				done <- true
			}()

			// Network analysis operation
			go func() {
				flows := suite.components.Network.GetFlows()
				require.NotNil(b, flows)
				done <- true
			}()

			// Wait for all operations to complete
			for i := 0; i < 3; i++ {
				<-done
			}
		}
	})
}
