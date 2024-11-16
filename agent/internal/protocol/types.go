package protocol

import "time"

// MessageType represents the type of message being sent
type MessageType string

const (
	// Server -> Agent messages
	TypePing       MessageType = "ping"
	TypeHandshake  MessageType = "handshake"
	TypeCommand    MessageType = "command"
	TypeDisconnect MessageType = "disconnect"

	// Agent -> Server messages
	TypePong        MessageType = "pong"
	TypeRegister    MessageType = "register"
	TypeCommandResp MessageType = "command_response"
	TypeHeartbeat   MessageType = "heartbeat"
	TypeError       MessageType = "error"
)

// Message represents the base message structure
type Message struct {
	Type      MessageType          `json:"type"`
	ID        string              `json:"id"`
	Timestamp time.Time           `json:"timestamp"`
	Payload   map[string]any      `json:"payload,omitempty"`
}

// AgentInfo contains information about the agent
type AgentInfo struct {
	ID            string            `json:"id"`
	Hostname      string            `json:"hostname"`
	IPAddress     string           `json:"ip_address"`
	OSType        string           `json:"os_type"`
	OSVersion     string           `json:"os_version"`
	AgentVersion  string           `json:"agent_version"`
	Labels        map[string]string `json:"labels,omitempty"`
	Capabilities  []string         `json:"capabilities"`
}

// HeartbeatInfo contains agent health information
type HeartbeatInfo struct {
	AgentID      string    `json:"agent_id"`
	Timestamp    time.Time `json:"timestamp"`
	LoadAverage  []float64 `json:"load_average"`
	MemoryUsage  float64   `json:"memory_usage"`
	DiskUsage    float64   `json:"disk_usage"`
	CPUUsage     float64   `json:"cpu_usage"`
	IsHealthy    bool      `json:"is_healthy"`
	ActiveJobs   int       `json:"active_jobs"`
	ErrorCount   int       `json:"error_count"`
	UptimeSeconds int64    `json:"uptime_seconds"`
}

// CommandRequest represents a command to be executed
type CommandRequest struct {
	Command     string            `json:"command"`
	Args        []string         `json:"args,omitempty"`
	Environment map[string]string `json:"environment,omitempty"`
	WorkingDir  string           `json:"working_dir,omitempty"`
	Timeout     time.Duration    `json:"timeout,omitempty"`
}

// CommandResponse represents the result of a command execution
type CommandResponse struct {
	CommandID   string    `json:"command_id"`
	ExitCode    int       `json:"exit_code"`
	Stdout      string    `json:"stdout"`
	Stderr      string    `json:"stderr"`
	StartTime   time.Time `json:"start_time"`
	EndTime     time.Time `json:"end_time"`
	Error       string    `json:"error,omitempty"`
}

// ErrorResponse represents an error message
type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details any    `json:"details,omitempty"`
}
