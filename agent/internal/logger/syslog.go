package logger

import (
	"encoding/json"
	"fmt"
	"log/syslog"
	"os"
	"time"

	"shh/agent/internal/config"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// SyslogCore implements zapcore.Core interface for syslog output
type SyslogCore struct {
	writer *syslog.Writer
	level  zapcore.Level
	fields []zapcore.Field
}

// NewSyslogCore creates a new SyslogCore
func NewSyslogCore(network, raddr, tag string, level zapcore.Level) (*SyslogCore, error) {
	writer, err := syslog.Dial(network, raddr, syslog.LOG_LOCAL0|syslog.LOG_INFO, tag)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to syslog: %w", err)
	}

	return &SyslogCore{
		writer: writer,
		level:  level,
		fields: make([]zapcore.Field, 0),
	}, nil
}

// Enabled implements zapcore.Core
func (c *SyslogCore) Enabled(level zapcore.Level) bool {
	return level >= c.level
}

// With implements zapcore.Core
func (c *SyslogCore) With(fields []zapcore.Field) zapcore.Core {
	clone := *c
	clone.fields = append(clone.fields, fields...)
	return &clone
}

// Check implements zapcore.Core
func (c *SyslogCore) Check(ent zapcore.Entry, ce *zapcore.CheckedEntry) *zapcore.CheckedEntry {
	if c.Enabled(ent.Level) {
		return ce.AddCore(ent, c)
	}
	return ce
}

// Write implements zapcore.Core
func (c *SyslogCore) Write(ent zapcore.Entry, fields []zapcore.Field) error {
	// Combine entry fields
	allFields := make([]zapcore.Field, 0, len(c.fields)+len(fields)+4)
	allFields = append(allFields, c.fields...)
	allFields = append(allFields, fields...)

	// Add standard fields
	allFields = append(allFields,
		zap.String("level", ent.Level.String()),
		zap.Time("timestamp", ent.Time),
		zap.String("logger", ent.LoggerName),
		zap.String("msg", ent.Message),
	)

	if ent.Caller.Defined {
		allFields = append(allFields,
			zap.String("caller", ent.Caller.String()),
		)
	}

	if ent.Stack != "" {
		allFields = append(allFields,
			zap.String("stacktrace", ent.Stack),
		)
	}

	// Convert fields to map
	m := make(map[string]interface{}, len(allFields))
	enc := zapcore.NewMapObjectEncoder()
	for _, f := range allFields {
		f.AddTo(enc)
	}
	for k, v := range enc.Fields {
		m[k] = v
	}

	// Convert to JSON
	jsonBytes, err := json.Marshal(m)
	if err != nil {
		return fmt.Errorf("failed to marshal log entry: %w", err)
	}

	// Write to syslog with appropriate level
	msg := string(jsonBytes)
	switch ent.Level {
	case zapcore.DebugLevel:
		return c.writer.Debug(msg)
	case zapcore.InfoLevel:
		return c.writer.Info(msg)
	case zapcore.WarnLevel:
		return c.writer.Warning(msg)
	case zapcore.ErrorLevel:
		return c.writer.Err(msg)
	case zapcore.DPanicLevel, zapcore.PanicLevel:
		return c.writer.Crit(msg)
	case zapcore.FatalLevel:
		return c.writer.Emerg(msg)
	default:
		return c.writer.Info(msg)
	}
}

// Sync implements zapcore.Core
func (c *SyslogCore) Sync() error {
	return c.writer.Close()
}

// NewSyslogLogger creates a new zap logger that writes to syslog
func NewSyslogLogger(cfg *config.LoggingConfig) (*zap.Logger, error) {
	// Get syslog configuration from environment
	syslogServer := os.Getenv("SYSLOG_SERVER")
	if syslogServer == "" {
		syslogServer = "localhost:1514"
	}

	syslogProtocol := os.Getenv("SYSLOG_PROTOCOL")
	if syslogProtocol == "" {
		syslogProtocol = "tcp"
	}

	// Parse log level
	level, err := zapcore.ParseLevel(cfg.Level)
	if err != nil {
		return nil, fmt.Errorf("invalid log level %q: %w", cfg.Level, err)
	}

	// Create syslog core
	core, err := NewSyslogCore(syslogProtocol, syslogServer, "shh-agent", level)
	if err != nil {
		return nil, fmt.Errorf("failed to create syslog core: %w", err)
	}

	// Create logger
	logger := zap.New(core,
		zap.AddCaller(),
		zap.AddStacktrace(zapcore.ErrorLevel),
		zap.Fields(
			zap.String("service", "shh-agent"),
			zap.String("version", "1.0.0"),
			zap.Time("boot_time", time.Now()),
		),
	)

	return logger, nil
}
