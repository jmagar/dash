package backup

import "time"

// Config defines backup configuration
type Config struct {
	// Paths to backup
	Paths []string `mapstructure:"paths"`

	// S3 bucket name
	Bucket string `mapstructure:"bucket"`

	// S3 prefix for backups
	Prefix string `mapstructure:"prefix"`

	// Backup retention period
	Retention time.Duration `mapstructure:"retention"`

	// Schedule for automatic backups (cron format)
	Schedule string `mapstructure:"schedule"`

	// Maximum concurrent uploads
	MaxConcurrent int `mapstructure:"max_concurrent"`

	// Maximum file size for single upload
	MaxFileSize int64 `mapstructure:"max_file_size"`

	// Compression level (0-9)
	CompressionLevel int `mapstructure:"compression_level"`

	// Encryption key for backups (optional)
	EncryptionKey string `mapstructure:"encryption_key"`
}
