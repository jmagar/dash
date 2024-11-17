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
