package docker

import (
	"bufio"
	"bytes"
	"encoding/binary"
	"io"
)

// LogScanner reads Docker container logs
type LogScanner struct {
	reader *bufio.Reader
	err    error
	text   string
}

// NewLogScanner creates a new log scanner
func NewLogScanner(r io.Reader) *LogScanner {
	return &LogScanner{
		reader: bufio.NewReader(r),
	}
}

// Scan advances the scanner to the next line
func (s *LogScanner) Scan() bool {
	if s.err != nil {
		return false
	}

	// Read header
	header := make([]byte, 8)
	_, err := io.ReadFull(s.reader, header)
	if err != nil {
		if err != io.EOF {
			s.err = err
		}
		return false
	}

	// Parse header
	size := binary.BigEndian.Uint32(header[4:])
	if size == 0 {
		return s.Scan()
	}

	// Read message
	message := make([]byte, size)
	_, err = io.ReadFull(s.reader, message)
	if err != nil {
		s.err = err
		return false
	}

	// Remove ANSI escape sequences
	s.text = string(bytes.TrimSpace(message))
	return true
}

// Text returns the current line
func (s *LogScanner) Text() string {
	return s.text
}

// Err returns any error encountered
func (s *LogScanner) Err() error {
	return s.err
}
