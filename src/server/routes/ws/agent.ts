import WebSocket from 'ws';
import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import { z } from 'zod';
import { LoggingManager } from '../../managers/LoggingManager';
import { LoggerAdapter } from '../../utils/logging/logger.adapter';

// Initialize logger
const logger = new LoggerAdapter(LoggingManager.getInstance(), {
  component: 'AgentConnection',
  service: 'WebSocket'
});

// Message type validation
export const MessageType = z.enum([
  'ping',
  'pong',
  'handshake',
  'register',
  'command',
  'command_response',
  'heartbeat',
  'disconnect',
  'error',
]);

// Base message validation
export const Message = z.object({
  type: MessageType,
  id: z.string(),
  timestamp: z.string().datetime(),
  payload: z.record(z.any()).optional(),
});

// Agent info validation
export const AgentInfo = z.object({
  id: z.string(),
  hostname: z.string(),
  ip_address: z.string(),
  os_type: z.string(),
  os_version: z.string(),
  agent_version: z.string(),
  labels: z.record(z.string()).optional(),
  capabilities: z.array(z.string()),
});

// Heartbeat info validation
export const HeartbeatInfo = z.object({
  agent_id: z.string(),
  timestamp: z.string().datetime(),
  load_average: z.array(z.number()),
  memory_usage: z.number(),
  disk_usage: z.number(),
  cpu_usage: z.number(),
  is_healthy: z.boolean(),
  active_jobs: z.number(),
  error_count: z.number(),
});

export class AgentConnection extends EventEmitter {
  private ws: WebSocket;
  private pingTimeout?: NodeJS.Timeout;
  private heartbeatTimeout?: NodeJS.Timeout;
  private agentInfo?: z.infer<typeof AgentInfo>;
  private lastHeartbeat?: z.infer<typeof HeartbeatInfo>;
  private isAlive = true;

  constructor(ws: WebSocket, private readonly agentId: string) {
    super();
    this.ws = ws;
    this.setupWebSocket();
  }

  private setupWebSocket() {
    // Use wrapper functions for async handlers to avoid promise misuse
    this.ws.on('message', (data: WebSocket.Data) => void this.handleMessage(data));
    this.ws.on('close', () => this.handleClose());
    this.ws.on('error', (error: Error) => this.handleError(error));
    this.ws.on('pong', () => this.heartbeat());

    // Start ping interval
    this.heartbeat();
  }

  private heartbeat() {
    this.isAlive = true;

    // Clear existing timeouts
    if (this.pingTimeout) clearTimeout(this.pingTimeout);
    if (this.heartbeatTimeout) clearTimeout(this.heartbeatTimeout);

    // Set ping timeout
    this.pingTimeout = setTimeout(() => {
      this.ping();
    }, 30000); // 30 seconds

    // Set heartbeat timeout
    this.heartbeatTimeout = setTimeout(() => {
      if (!this.isAlive) {
        logger.warn('Agent heartbeat timeout', {
          agentId: this.agentId,
          lastHeartbeat: this.lastHeartbeat?.timestamp
        });
        this.terminate();
        return;
      }
      this.isAlive = false;
    }, 60000); // 60 seconds
  }

  private async handleMessage(data: WebSocket.Data) {
    try {
      const raw = JSON.parse(data.toString()) as unknown;
      const message = Message.parse(raw);

      switch (message.type) {
        case 'register': {
          await this.handleRegistration(message);
          break;
        }
        case 'heartbeat': {
          this.handleHeartbeat(message);
          break;
        }
        case 'command_response': {
          this.emit('command_response', message);
          break;
        }
        case 'pong': {
          this.heartbeat();
          break;
        }
        case 'error': {
          const errorMessage = this.extractErrorMessage(message);
          logger.error('Received error from agent', {
            agentId: this.agentId,
            error: errorMessage,
            messageId: message.id
          });
          break;
        }
        default: {
          logger.warn('Received unknown message type', {
            agentId: this.agentId,
            messageType: message.type,
            messageId: message.id
          });
        }
      }
    } catch (error) {
      logger.error('Failed to handle message', {
        agentId: this.agentId,
        error: error instanceof Error ? error.message : String(error),
        data: typeof data === 'string' ? data : data.toString()
      });
    }
  }

  private extractErrorMessage(message: z.infer<typeof Message>): string {
    if (message.payload && typeof message.payload === 'object') {
      if ('error' in message.payload && typeof message.payload.error === 'string') {
        return message.payload.error;
      }
    }
    return 'Unknown error';
  }

  private async handleRegistration(message: z.infer<typeof Message>) {
    try {
      const agentInfo = AgentInfo.parse(message.payload?.agent_info);
      this.agentInfo = agentInfo;

      // Emit registration event
      this.emit('registered', agentInfo);

      // Send handshake response
      await this.send({
        type: 'handshake',
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        payload: {
          status: 'accepted',
          server_time: new Date().toISOString(),
        },
      });

      logger.info('Agent registered', {
        agentId: this.agentId,
        agentInfo: agentInfo
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid registration message';
      logger.error('Failed to handle registration', {
        agentId: this.agentId,
        error: errorMessage,
        data: message
      });
      this.terminate();
    }
  }

  private handleHeartbeat(message: z.infer<typeof Message>): void {
    try {
      const heartbeat = HeartbeatInfo.parse(message.payload);
      this.lastHeartbeat = heartbeat;
      this.emit('heartbeat', heartbeat);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid heartbeat message';
      logger.error('Failed to handle heartbeat', {
        agentId: this.agentId,
        error: errorMessage,
        data: message
      });
    }
  }

  private handleClose() {
    this.cleanup();
    this.emit('disconnected', this.agentId);
    logger.info('Agent disconnected', {
      agentId: this.agentId
    });
  }

  private handleError(error: Error) {
    logger.error('Agent error', {
      agentId: this.agentId,
      error: error.message
    });
    this.cleanup();
  }

  private cleanup() {
    if (this.pingTimeout) clearTimeout(this.pingTimeout);
    if (this.heartbeatTimeout) clearTimeout(this.heartbeatTimeout);
  }

  private ping() {
    this.send({
      type: 'ping',
      id: randomUUID(),
      timestamp: new Date().toISOString(),
    }).catch((error) => {
      const errorMessage = error instanceof Error ? error.message : 'Error sending ping';
      logger.error('Failed to send ping', {
        agentId: this.agentId,
        error: errorMessage
      });
    });
  }

  public async send(message: z.infer<typeof Message>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws.send(JSON.stringify(message), (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  public async executeCommand(command: string, args: string[] = []): Promise<void> {
    return this.send({
      type: 'command',
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      payload: {
        command,
        args,
      },
    });
  }

  public terminate() {
    this.cleanup();
    this.ws.terminate();
  }

  public getAgentInfo() {
    return this.agentInfo;
  }

  public getLastHeartbeat() {
    return this.lastHeartbeat;
  }

  public isConnected() {
    return this.ws.readyState === WebSocket.OPEN;
  }
}

// Export types for use in other files
export type { z };
