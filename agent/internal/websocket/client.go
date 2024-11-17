package websocket

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"go.uber.org/zap"

	"shh/agent/internal/protocol"
)

type Client struct {
	url       string
	agentInfo protocol.AgentInfo
	conn      *websocket.Conn
	logger    *zap.Logger
	handlers  map[protocol.MessageType]protocol.MessageHandler
	done      chan struct{}
	mu        sync.RWMutex
}

func NewClient(url string, agentInfo protocol.AgentInfo, logger *zap.Logger) *Client {
	return &Client{
		url:       url,
		agentInfo: agentInfo,
		logger:    logger,
		handlers:  make(map[protocol.MessageType]protocol.MessageHandler),
		done:      make(chan struct{}),
	}
}

func (c *Client) Connect(ctx context.Context) error {
	dialer := websocket.Dialer{
		HandshakeTimeout: 10 * time.Second,
	}

	conn, _, err := dialer.DialContext(ctx, c.url, nil)
	if err != nil {
		return fmt.Errorf("failed to connect to websocket: %w", err)
	}

	c.mu.Lock()
	c.conn = conn
	c.mu.Unlock()

	// Send registration message with agent info
	regMsg := protocol.Message{
		Type:      protocol.TypeRegister,
		ID:        fmt.Sprintf("register-%d", time.Now().UnixNano()),
		Timestamp: time.Now(),
	}

	regPayload, err := json.Marshal(c.agentInfo)
	if err != nil {
		return fmt.Errorf("failed to marshal agent info: %w", err)
	}
	regMsg.Payload = regPayload

	if err := c.SendMessage(regMsg); err != nil {
		return fmt.Errorf("failed to send registration message: %w", err)
	}

	go c.readPump()

	return nil
}

func (c *Client) RegisterHandler(messageType protocol.MessageType, handler protocol.MessageHandler) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.handlers[messageType] = handler
}

func (c *Client) readPump() {
	defer func() {
		c.mu.Lock()
		if c.conn != nil {
			c.conn.Close()
			c.conn = nil
		}
		c.mu.Unlock()
		close(c.done)
	}()

	for {
		messageType, data, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				c.logger.Error("Unexpected websocket close", zap.Error(err))
			}
			return
		}

		if messageType != websocket.TextMessage {
			continue
		}

		var msg protocol.Message
		if err := json.Unmarshal(data, &msg); err != nil {
			c.logger.Error("Failed to unmarshal message", zap.Error(err))
			continue
		}

		c.mu.RLock()
		handler, exists := c.handlers[msg.Type]
		c.mu.RUnlock()

		if !exists {
			c.logger.Warn("No handler registered for message type",
				zap.String("type", string(msg.Type)))
			continue
		}

		if err := handler(context.Background(), msg); err != nil {
			c.logger.Error("Handler failed",
				zap.String("type", string(msg.Type)),
				zap.Error(err))
		}
	}
}

func (c *Client) SendMessage(msg protocol.Message) error {
	c.mu.RLock()
	conn := c.conn
	c.mu.RUnlock()

	if conn == nil {
		return fmt.Errorf("not connected")
	}

	data, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
		return fmt.Errorf("failed to write message: %w", err)
	}

	return nil
}

func (c *Client) Close(ctx context.Context) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.conn != nil {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
			if err := c.conn.WriteMessage(websocket.CloseMessage,
				websocket.FormatCloseMessage(websocket.CloseNormalClosure, "")); err != nil {
				c.logger.Warn("Error sending close message", zap.Error(err))
			}
			if err := c.conn.Close(); err != nil {
				return fmt.Errorf("error closing connection: %w", err)
			}
			c.conn = nil
		}
	}

	select {
	case <-c.done:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

func (c *Client) HealthCheck(ctx context.Context) error {
	c.mu.RLock()
	conn := c.conn
	c.mu.RUnlock()

	if conn == nil {
		return fmt.Errorf("not connected")
	}

	return nil
}

func (c *Client) Shutdown(ctx context.Context) error {
	return c.Close(ctx)
}
