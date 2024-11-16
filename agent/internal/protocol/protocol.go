//go:build !test
// +build !test

// Package protocol defines the communication protocol between agent and server
package protocol

import (
	"context"
	"encoding/json"
	"time"
)

// MessageType represents the type of message being sent
type MessageType string

// Protocol message types
const (
	// Server -> Agent messages
	TypeCommand  MessageType = "command"
	TypeConfig   MessageType = "config"
	TypeUpdate   MessageType = "update"
	TypeMetrics  MessageType = "metrics"
	TypeLogs     MessageType = "logs"
	TypeResponse MessageType = "response"

	// Agent -> Server messages
	TypeRegister  MessageType = "register"
	TypeHeartbeat MessageType = "heartbeat"
	TypeResult    MessageType = "result"
)

// Message represents a protocol message between agent and server
type Message struct {
	Type      MessageType     `json:"type"`
	ID        string         `json:"id"`
	Timestamp time.Time      `json:"timestamp"`
	Payload   json.RawMessage `json:"payload"`
}

// MessageHandler is a function that handles a specific type of message
type MessageHandler func(ctx context.Context, msg Message) error

// AgentInfo contains information about the agent
type AgentInfo struct {
	ID          string            `json:"id"`
	Version     string            `json:"version"`
	Hostname    string            `json:"hostname"`
	Platform    string            `json:"platform"`
	OS          string            `json:"os"`
	Arch        string            `json:"arch"`
	Labels      map[string]string `json:"labels,omitempty"`
	Features    []string          `json:"features,omitempty"`
}

// AgentCommand represents a command to be executed by the agent
type AgentCommand struct {
	Command string   `json:"command"`
	Args    []string `json:"args,omitempty"`
}

// AgentResponse represents a response from the agent
type AgentResponse struct {
	Success bool            `json:"success"`
	Data    json.RawMessage `json:"data,omitempty"`
	Error   string         `json:"error,omitempty"`
}

// ResultPayload represents the result of a command execution
type ResultPayload struct {
	CommandID string `json:"command_id"`
	ExitCode  int    `json:"exit_code"`
	Stdout    string `json:"stdout"`
	Stderr    string `json:"stderr"`
	Error     string `json:"error,omitempty"`
}

// AgentMetrics represents system metrics collected by the agent
type AgentMetrics struct {
	CPU     float64 `json:"cpu"`
	Memory  float64 `json:"memory"`
	Disk    float64 `json:"disk"`
	Network struct {
		RxBytes int64 `json:"rx_bytes"`
		TxBytes int64 `json:"tx_bytes"`
	} `json:"network"`
}

// AgentLog represents a log entry from the agent
type AgentLog struct {
	Level     string                 `json:"level"`
	Message   string                 `json:"message"`
	Timestamp time.Time             `json:"timestamp"`
	Fields    map[string]interface{} `json:"fields,omitempty"`
}

// AgentConfig represents agent configuration
type AgentConfig struct {
	Settings map[string]interface{} `json:"settings"`
}

// AgentUpdate represents an update notification for the agent
type AgentUpdate struct {
	Version     string `json:"version"`
	DownloadURL string `json:"download_url"`
	Checksum    string `json:"checksum"`
}

// AgentHeartbeat represents a heartbeat message from the agent
type AgentHeartbeat struct {
	Status    string       `json:"status"`
	Uptime    int64       `json:"uptime"`
	LoadAvg   [3]float64  `json:"load_avg"`
	Processes int         `json:"processes"`
	Metrics   AgentMetrics `json:"metrics"`
}

// CommandResult represents the result of executing a command
type CommandResult struct {
	ExitCode int    `json:"exit_code"`
	Stdout   string `json:"stdout"`
	Stderr   string `json:"stderr"`
}
