package process

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"shh/agent/internal/metrics"

	"go.uber.org/zap"
)

// CommandState represents the current state of a command
type CommandState string

const (
	StateStarting  CommandState = "starting"
	StateRunning   CommandState = "running"
	StateComplete  CommandState = "complete"
	StateFailed    CommandState = "failed"
	StateCancelled CommandState = "cancelled"
)

// CommandOutput represents a single output line
type CommandOutput struct {
	Timestamp time.Time `json:"timestamp"`
	Stream    string    `json:"stream"` // stdout or stderr
	Line      string    `json:"line"`
}

// CommandResult contains the complete execution result
type CommandResult struct {
	ID            string                `json:"id"`
	Command       string                `json:"command"`
	Args          []string             `json:"args"`
	WorkingDir    string               `json:"working_dir"`
	Environment   []string             `json:"environment"`
	StartTime     time.Time            `json:"start_time"`
	EndTime       time.Time            `json:"end_time,omitempty"`
	State         CommandState         `json:"state"`
	ExitCode      int                  `json:"exit_code"`
	Error         string               `json:"error,omitempty"`
	OutputFile    string               `json:"output_file"`
	ResourceUsage *metrics.ProcessMetrics `json:"resource_usage,omitempty"`
}

// OutputWriter manages command output logging
type OutputWriter struct {
	file    *os.File
	buffer  *bytes.Buffer
	mu      sync.Mutex
	logger  *zap.Logger
	cmdID   string
	stream  string
	logSize int64
}

// NewOutputWriter creates a new output writer
func NewOutputWriter(outputDir, cmdID, stream string, logger *zap.Logger) (*OutputWriter, error) {
	// Create output directory if it doesn't exist
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create output directory: %w", err)
	}

	// Create output file
	filename := filepath.Join(outputDir, fmt.Sprintf("%s-%s.log", cmdID, stream))
	file, err := os.OpenFile(filename, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return nil, fmt.Errorf("failed to create output file: %w", err)
	}

	return &OutputWriter{
		file:    file,
		buffer:  bytes.NewBuffer(nil),
		logger:  logger,
		cmdID:   cmdID,
		stream:  stream,
		logSize: 0,
	}, nil
}

// Write implements io.Writer
func (w *OutputWriter) Write(p []byte) (n int, err error) {
	w.mu.Lock()
	defer w.mu.Unlock()

	// Write to file
	n, err = w.file.Write(p)
	if err != nil {
		return n, fmt.Errorf("failed to write to file: %w", err)
	}

	// Update log size
	w.logSize += int64(n)

	// Buffer the output for processing
	w.buffer.Write(p)

	// Process complete lines
	for {
		line, err := w.buffer.ReadString('\n')
		if err == io.EOF {
			// Put the incomplete line back in the buffer
			w.buffer.WriteString(line)
			break
		}
		if err != nil {
			return n, fmt.Errorf("failed to read buffer: %w", err)
		}

		// Create output entry
		output := CommandOutput{
			Timestamp: time.Now(),
			Stream:    w.stream,
			Line:      strings.TrimRight(line, "\n"),
		}

		// Log output
		w.logger.Debug("Command output",
			zap.String("command_id", w.cmdID),
			zap.String("stream", w.stream),
			zap.String("line", output.Line))

		// Write JSON entry to file
		if err := json.NewEncoder(w.file).Encode(output); err != nil {
			return n, fmt.Errorf("failed to write JSON entry: %w", err)
		}
	}

	return n, nil
}

// Close closes the output writer
func (w *OutputWriter) Close() error {
	w.mu.Lock()
	defer w.mu.Unlock()

	// Process any remaining data
	if w.buffer.Len() > 0 {
		output := CommandOutput{
			Timestamp: time.Now(),
			Stream:    w.stream,
			Line:      strings.TrimRight(w.buffer.String(), "\n"),
		}

		// Log output
		w.logger.Debug("Command output",
			zap.String("command_id", w.cmdID),
			zap.String("stream", w.stream),
			zap.String("line", output.Line))

		// Write JSON entry to file
		if err := json.NewEncoder(w.file).Encode(output); err != nil {
			return fmt.Errorf("failed to write final JSON entry: %w", err)
		}
	}

	return w.file.Close()
}

// GetSize returns the current log size
func (w *OutputWriter) GetSize() int64 {
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.logSize
}

// ReadOutput reads command output from the log file
func ReadOutput(filename string, offset, limit int64) ([]CommandOutput, error) {
	file, err := os.Open(filename)
	if err != nil {
		return nil, fmt.Errorf("failed to open output file: %w", err)
	}
	defer file.Close()

	// Seek to offset
	if offset > 0 {
		if _, err := file.Seek(offset, io.SeekStart); err != nil {
			return nil, fmt.Errorf("failed to seek file: %w", err)
		}
	}

	var outputs []CommandOutput
	decoder := json.NewDecoder(file)
	count := int64(0)

	for decoder.More() {
		if limit > 0 && count >= limit {
			break
		}

		var output CommandOutput
		if err := decoder.Decode(&output); err != nil {
			return nil, fmt.Errorf("failed to decode output: %w", err)
		}

		outputs = append(outputs, output)
		count++
	}

	return outputs, nil
}

// GetOutputMetadata returns metadata about the command output
type OutputMetadata struct {
	Size    int64     `json:"size"`
	ModTime time.Time `json:"mod_time"`
	Lines   int64     `json:"lines"`
}

func GetOutputMetadata(filename string) (*OutputMetadata, error) {
	info, err := os.Stat(filename)
	if err != nil {
		return nil, fmt.Errorf("failed to stat file: %w", err)
	}

	file, err := os.Open(filename)
	if err != nil {
		return nil, fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	// Count lines
	var lines int64
	scanner := json.NewDecoder(file)
	for scanner.More() {
		var output CommandOutput
		if err := scanner.Decode(&output); err != nil {
			return nil, fmt.Errorf("failed to decode output: %w", err)
		}
		lines++
	}

	return &OutputMetadata{
		Size:    info.Size(),
		ModTime: info.ModTime(),
		Lines:   lines,
	}, nil
}
