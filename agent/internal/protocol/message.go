package protocol

import (
	"encoding/json"
	"time"
)

// MessageType represents the type of message
type MessageType string

const (
	// Server -> Agent
	TypeCommand MessageType = "command"
	TypeConfig  MessageType = "config"
	TypeUpdate  MessageType = "update"

	// Agent -> Server
	TypeRegister  MessageType = "register"
	TypeHeartbeat MessageType = "heartbeat"
	TypeMetrics   MessageType = "metrics"
	TypeResult    MessageType = "result"
)

// Message represents a protocol message
type Message struct {
	Type      MessageType          `json:"type"`
	ID        string              `json:"id"`
	Timestamp time.Time           `json:"timestamp"`
	Payload   json.RawMessage     `json:"payload"`
}

// AgentInfo represents agent registration information
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

// AgentMetrics represents agent metrics
type AgentMetrics struct {
	CPU     float64 `json:"cpu"`
	Memory  float64 `json:"memory"`
	Disk    float64 `json:"disk"`
	Network struct {
		RxBytes int64 `json:"rx_bytes"`
		TxBytes int64 `json:"tx_bytes"`
	} `json:"network"`
}

// AgentCommand represents a command to execute
type AgentCommand struct {
	Command   string   `json:"command"`
	Args      []string `json:"args"`
	Timeout   string   `json:"timeout,omitempty"`
	Directory string   `json:"directory,omitempty"`
}

// AgentCommandResult represents command execution results
type AgentCommandResult struct {
	CommandID string `json:"command_id"`
	ExitCode  int    `json:"exit_code"`
	Stdout    string `json:"stdout"`
	Stderr    string `json:"stderr"`
	Error     string `json:"error,omitempty"`
}

// AgentHeartbeat represents a heartbeat message
type AgentHeartbeat struct {
	Status    string       `json:"status"`
	Uptime    int64       `json:"uptime"`
	LoadAvg   [3]float64  `json:"load_avg"`
	Processes int         `json:"processes"`
	Metrics   AgentMetrics `json:"metrics"`
}
