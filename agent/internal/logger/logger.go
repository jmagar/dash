package logger

import (
	"fmt"
	"os"
	"path/filepath"

	"shh/agent/internal/config"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"gopkg.in/natefinch/lumberjack.v2"
)

// Setup initializes the logger with the given configuration
func Setup(cfg *config.LoggingConfig) (*zap.Logger, error) {
	// Create base encoder config
	encoderConfig := zap.NewProductionEncoderConfig()
	encoderConfig.TimeKey = "timestamp"
	encoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	encoderConfig.EncodeLevel = zapcore.CapitalLevelEncoder

	// Create JSON encoder
	encoder := zapcore.NewJSONEncoder(encoderConfig)

	// Setup log level
	level, err := zapcore.ParseLevel(cfg.Level)
	if err != nil {
		return nil, fmt.Errorf("invalid log level %q: %w", cfg.Level, err)
	}

	var cores []zapcore.Core

	// Add console output
	cores = append(cores, zapcore.NewCore(
		encoder,
		zapcore.AddSync(os.Stdout),
		level,
	))

	// Add file output if configured
	if cfg.File != "" {
		// Ensure log directory exists
		if err := os.MkdirAll(filepath.Dir(cfg.File), 0755); err != nil {
			return nil, fmt.Errorf("failed to create log directory: %w", err)
		}

		// Setup log rotation
		writer := &lumberjack.Logger{
			Filename:   cfg.File,
			MaxSize:    cfg.MaxSize,    // MB
			MaxBackups: cfg.MaxBackups,
			MaxAge:     cfg.MaxAge,     // days
			Compress:   cfg.Compress,
		}

		cores = append(cores, zapcore.NewCore(
			encoder,
			zapcore.AddSync(writer),
			level,
		))
	}

	// Combine cores
	core := zapcore.NewTee(cores...)

	// Create logger
	logger := zap.New(core,
		zap.AddCaller(),
		zap.AddStacktrace(zapcore.ErrorLevel),
	)

	// Replace global logger
	zap.ReplaceGlobals(logger)

	return logger, nil
}

// Sync flushes any buffered log entries
func Sync(logger *zap.Logger) error {
	if err := logger.Sync(); err != nil {
		return fmt.Errorf("failed to sync logger: %w", err)
	}
	return nil
}
