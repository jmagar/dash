package backup

import "time"

// BackupConfig represents backup configuration
type BackupConfig struct {
	Path      string        `json:"path"`
	Interval  time.Duration `json:"interval"`
	Compress  bool         `json:"compress"`
	Encrypt   bool         `json:"encrypt"`
	MaxAge    time.Duration `json:"max_age"`
	MaxSize   int64        `json:"max_size"`
	Retention time.Duration `json:"retention"`
	Schedule  string       `json:"schedule"`
}

// Config is an alias for BackupConfig for backward compatibility
type Config = BackupConfig
