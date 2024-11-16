package config

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"time"

	"github.com/spf13/viper"
)

type Config struct {
	Agent     AgentConfig     `mapstructure:"agent"`
	Server    ServerConfig    `mapstructure:"server"`
	Metrics   MetricsConfig   `mapstructure:"metrics"`
	Logging   LoggingConfig   `mapstructure:"logging"`
	Security  SecurityConfig  `mapstructure:"security"`
}

type AgentConfig struct {
	ID           string            `mapstructure:"id"`
	Name         string            `mapstructure:"name"`
	Version      string            `mapstructure:"version"`
	Labels       map[string]string `mapstructure:"labels"`
	DataDir      string            `mapstructure:"data_dir"`
	MaxJobs      int               `mapstructure:"max_jobs"`
	ShutdownWait time.Duration     `mapstructure:"shutdown_wait"`
}

type ServerConfig struct {
	URL            string        `mapstructure:"url"`
	ReconnectDelay time.Duration `mapstructure:"reconnect_delay"`
	Timeout        time.Duration `mapstructure:"timeout"`
}

type MetricsConfig struct {
	Enabled       bool          `mapstructure:"enabled"`
	Interval      time.Duration `mapstructure:"interval"`
	RetentionDays int           `mapstructure:"retention_days"`
}

type LoggingConfig struct {
	Level      string `mapstructure:"level"`
	File       string `mapstructure:"file"`
	MaxSize    int    `mapstructure:"max_size"`
	MaxBackups int    `mapstructure:"max_backups"`
	MaxAge     int    `mapstructure:"max_age"`
	Compress   bool   `mapstructure:"compress"`
}

type SecurityConfig struct {
	TLSEnabled  bool   `mapstructure:"tls_enabled"`
	CertFile    string `mapstructure:"cert_file"`
	KeyFile     string `mapstructure:"key_file"`
	CAFile      string `mapstructure:"ca_file"`
	SkipVerify  bool   `mapstructure:"skip_verify"`
}

// Load reads configuration from file and environment variables
func Load() (*Config, error) {
	v := viper.New()

	// Set default configurations
	setDefaults(v)

	// Read config file
	v.SetConfigName("config")
	v.SetConfigType("yaml")
	v.AddConfigPath("/etc/shh-agent/")
	v.AddConfigPath("$HOME/.shh-agent")
	v.AddConfigPath(".")

	// Read environment variables
	v.SetEnvPrefix("SHH")
	v.AutomaticEnv()

	// Generate default agent ID if not set
	if v.GetString("agent.id") == "" {
		hostname, err := os.Hostname()
		if err != nil {
			return nil, fmt.Errorf("failed to get hostname: %w", err)
		}
		v.Set("agent.id", fmt.Sprintf("%s-%d", hostname, os.Getpid()))
	}

	// Read config file
	if err := v.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("failed to read config file: %w", err)
		}
	}

	var config Config
	if err := v.Unmarshal(&config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	// Create data directory if it doesn't exist
	if err := os.MkdirAll(config.Agent.DataDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create data directory: %w", err)
	}

	return &config, nil
}

func setDefaults(v *viper.Viper) {
	// Agent defaults
	v.SetDefault("agent.version", "1.0.0")
	v.SetDefault("agent.data_dir", filepath.Join(os.TempDir(), "shh-agent"))
	v.SetDefault("agent.max_jobs", runtime.NumCPU()*2)
	v.SetDefault("agent.shutdown_wait", 30*time.Second)

	// Server defaults
	v.SetDefault("server.url", "ws://localhost:4000/ws/agent")
	v.SetDefault("server.reconnect_delay", 5*time.Second)
	v.SetDefault("server.timeout", 30*time.Second)

	// Metrics defaults
	v.SetDefault("metrics.enabled", true)
	v.SetDefault("metrics.interval", 15*time.Second)
	v.SetDefault("metrics.retention_days", 7)

	// Logging defaults
	v.SetDefault("logging.level", "info")
	v.SetDefault("logging.file", "")
	v.SetDefault("logging.max_size", 100)    // 100MB
	v.SetDefault("logging.max_backups", 3)
	v.SetDefault("logging.max_age", 28)      // 28 days
	v.SetDefault("logging.compress", true)

	// Security defaults
	v.SetDefault("security.tls_enabled", false)
	v.SetDefault("security.skip_verify", false)
}
