package websocket

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"shh/agent/internal/protocol"
	"go.uber.org/zap"
)

const (
	// Time allowed to write a message to the peer
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer
	pongWait = 60 * time.Second

	// Send pings to peer with this period (must be less than pongWait)
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer
	maxMessageSize = 512 * 1024 // 512KB
)

// Client manages the WebSocket connection to the server
type Client struct {
	url            string
	conn           *websocket.Conn
	send           chan protocol.Message
	logger         *zap.Logger
	mu             sync.RWMutex
	isConnected    bool
	handlers       map[protocol.MessageType]MessageHandler
	reconnectDelay time.Duration
	agentInfo      protocol.AgentInfo
}

// MessageHandler is a function that handles incoming messages
type MessageHandler func(context.Context, protocol.Message) error

// NewClient creates a new WebSocket client
func NewClient(serverURL string, agentInfo protocol.AgentInfo, logger *zap.Logger) *Client {
	return &Client{
		url:            serverURL,
		send:           make(chan protocol.Message, 256),
		logger:         logger,
		handlers:       make(map[protocol.MessageType]MessageHandler),
		reconnectDelay: 5 * time.Second,
		agentInfo:      agentInfo,
	}
}

// Connect establishes the WebSocket connection
func (c *Client) Connect(ctx context.Context) error {
	u, err := url.Parse(c.url)
	if err != nil {
		return fmt.Errorf("invalid URL: %w", err)
	}

	// Add agent ID as query parameter for authentication
	q := u.Query()
	q.Set("agent_id", c.agentInfo.ID)
	u.RawQuery = q.Encode()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
			if err := c.connect(ctx, u.String()); err != nil {
				c.logger.Error("Connection failed", zap.Error(err))
				time.Sleep(c.reconnectDelay)
				continue
			}
			return nil
		}
	}
}

// connect performs the actual WebSocket connection
func (c *Client) connect(ctx context.Context, url string) error {
	c.logger.Info("Connecting to server", zap.String("url", url))

	dialer := websocket.Dialer{
		HandshakeTimeout: 10 * time.Second,
	}

	conn, _, err := dialer.DialContext(ctx, url, nil)
	if err != nil {
		return fmt.Errorf("dial failed: %w", err)
	}

	c.mu.Lock()
	c.conn = conn
	c.isConnected = true
	c.mu.Unlock()

	// Start read/write pumps
	go c.readPump(ctx)
	go c.writePump(ctx)

	// Send registration message
	return c.sendRegistration()
}

// readPump pumps messages from the WebSocket connection
func (c *Client) readPump(ctx context.Context) {
	defer func() {
		c.disconnect()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				c.logger.Error("Read error", zap.Error(err))
			}
			return
		}

		var msg protocol.Message
		if err := json.Unmarshal(message, &msg); err != nil {
			c.logger.Error("Failed to unmarshal message", zap.Error(err))
			continue
		}

		// Handle message based on type
		if handler, ok := c.handlers[msg.Type]; ok {
			if err := handler(ctx, msg); err != nil {
				c.logger.Error("Handler error", 
					zap.String("type", string(msg.Type)),
					zap.Error(err))
			}
		} else {
			c.logger.Warn("No handler for message type", 
				zap.String("type", string(msg.Type)))
		}
	}
}

// writePump pumps messages to the WebSocket connection
func (c *Client) writePump(ctx context.Context) {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.disconnect()
	}()

	for {
		select {
		case <-ctx.Done():
			return
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				c.logger.Error("Failed to get writer", zap.Error(err))
				return
			}

			data, err := json.Marshal(message)
			if err != nil {
				c.logger.Error("Failed to marshal message", zap.Error(err))
				return
			}

			if _, err := w.Write(data); err != nil {
				c.logger.Error("Failed to write message", zap.Error(err))
				return
			}

			if err := w.Close(); err != nil {
				c.logger.Error("Failed to close writer", zap.Error(err))
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// SendMessage sends a message to the server
func (c *Client) SendMessage(msg protocol.Message) error {
	c.mu.RLock()
	if !c.isConnected {
		c.mu.RUnlock()
		return fmt.Errorf("not connected")
	}
	c.mu.RUnlock()

	select {
	case c.send <- msg:
		return nil
	default:
		return fmt.Errorf("send buffer full")
	}
}

// RegisterHandler registers a handler for a specific message type
func (c *Client) RegisterHandler(msgType protocol.MessageType, handler MessageHandler) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.handlers[msgType] = handler
}

// disconnect closes the connection and marks the client as disconnected
func (c *Client) disconnect() {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.conn != nil {
		c.conn.Close()
		c.conn = nil
	}
	c.isConnected = false
}

// sendRegistration sends the initial registration message
func (c *Client) sendRegistration() error {
	msg := protocol.Message{
		Type:      protocol.TypeRegister,
		ID:        c.agentInfo.ID,
		Timestamp: time.Now(),
		Payload: map[string]any{
			"agent_info": c.agentInfo,
		},
	}
	return c.SendMessage(msg)
}

// IsConnected returns the current connection status
func (c *Client) IsConnected() bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.isConnected
}

// HealthCheck implements the health.Checker interface
func (c *Client) HealthCheck(ctx context.Context) error {
	if !c.IsConnected() {
		return fmt.Errorf("websocket not connected")
	}
	return nil
}

// Shutdown implements graceful shutdown
func (c *Client) Shutdown(ctx context.Context) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.conn != nil {
		// Send disconnect message
		msg := protocol.Message{
			Type:      protocol.TypeDisconnect,
			ID:        c.agentInfo.ID,
			Timestamp: time.Now(),
		}
		if err := c.SendMessage(msg); err != nil {
			c.logger.Warn("Failed to send disconnect message", zap.Error(err))
		}

		// Close connection
		if err := c.conn.WriteMessage(
			websocket.CloseMessage,
			websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""),
		); err != nil {
			c.logger.Warn("Failed to send close message", zap.Error(err))
		}
		c.conn.Close()
		c.conn = nil
	}

	close(c.send)
	c.isConnected = false
	return nil
}
