package process

import (
	"errors"
	"fmt"
)

var (
	// ErrProcessNotFound indicates the process doesn't exist
	ErrProcessNotFound = errors.New("process not found")

	// ErrProcessAlreadyExists indicates a process with the same ID already exists
	ErrProcessAlreadyExists = errors.New("process already exists")

	// ErrMaxProcessesReached indicates the maximum number of processes has been reached
	ErrMaxProcessesReached = errors.New("maximum number of processes reached")

	// ErrProcessNotRunning indicates the process is not in a running state
	ErrProcessNotRunning = errors.New("process is not running")

	// ErrInvalidState indicates an invalid process state transition
	ErrInvalidState = errors.New("invalid process state")

	// ErrOutputNotFound indicates the process output file doesn't exist
	ErrOutputNotFound = errors.New("process output not found")

	// ErrProcessTimeout indicates the process exceeded its timeout
	ErrProcessTimeout = errors.New("process timeout exceeded")
)

// ProcessError represents a process-related error with context
type ProcessError struct {
	ProcessID string
	Op        string
	Err       error
}

func (e *ProcessError) Error() string {
	if e.ProcessID != "" {
		return fmt.Sprintf("process %s: %s: %v", e.ProcessID, e.Op, e.Err)
	}
	return fmt.Sprintf("%s: %v", e.Op, e.Err)
}

func (e *ProcessError) Unwrap() error {
	return e.Err
}

// NewProcessError creates a new ProcessError
func NewProcessError(processID, op string, err error) error {
	return &ProcessError{
		ProcessID: processID,
		Op:        op,
		Err:       err,
	}
}

// IsProcessNotFound returns true if the error indicates a process was not found
func IsProcessNotFound(err error) bool {
	return errors.Is(err, ErrProcessNotFound)
}

// IsProcessAlreadyExists returns true if the error indicates a process already exists
func IsProcessAlreadyExists(err error) bool {
	return errors.Is(err, ErrProcessAlreadyExists)
}

// IsMaxProcessesReached returns true if the error indicates max processes reached
func IsMaxProcessesReached(err error) bool {
	return errors.Is(err, ErrMaxProcessesReached)
}

// IsProcessNotRunning returns true if the error indicates a process is not running
func IsProcessNotRunning(err error) bool {
	return errors.Is(err, ErrProcessNotRunning)
}

// IsInvalidState returns true if the error indicates an invalid state transition
func IsInvalidState(err error) bool {
	return errors.Is(err, ErrInvalidState)
}

// IsOutputNotFound returns true if the error indicates output was not found
func IsOutputNotFound(err error) bool {
	return errors.Is(err, ErrOutputNotFound)
}

// IsProcessTimeout returns true if the error indicates a process timeout
func IsProcessTimeout(err error) bool {
	return errors.Is(err, ErrProcessTimeout)
}
