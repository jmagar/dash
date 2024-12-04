import WebSocket from 'ws';
import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import { LoggingManager } from '../../managers/utils/LoggingManager';

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
  uptime_seconds: z.number(),
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
    this.ws.on('message', this.handleMessage.bind(this));
    this.ws.on('close', this.handleClose.bind(this));
    this.ws.on('error', this.handleError.bind(this));
    this.ws.on('pong', this.heartbeat.bind(this));

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
        loggerLoggingManager.getInstance().();
        this.terminate();
        return;
      }
      this.isAlive = false;
    }, 60000); // 60 seconds
  }

  private async handleMessage(data: WebSocket.Data) {
    try {
      const raw = JSON.parse(data.toString());
      const message = Message.parse(raw);
      let errorMessage: string;

      switch (message.type) {
        case 'register':
          await this.handleRegistration(message);
          break;

        case 'heartbeat':
          await this.handleHeartbeat(message);
          break;

        case 'command_response':
          this.emit('command_response', message);
          break;

        case 'pong':
          this.heartbeat();
          break;

        case 'error':
          errorMessage = 'Unknown error';
          if (message.payload && typeof message.payload === 'object') {
            if ('error' in message.payload && typeof message.payload.error === 'string') {
              errorMessage = message.payload.error;
            }
          }

          loggerLoggingManager.getInstance().();
          break;

        default:
          loggerLoggingManager.getInstance().();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      loggerLoggingManager.getInstance().();
    }
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

      loggerLoggingManager.getInstance().();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid registration message';
      loggerLoggingManager.getInstance().();
      this.terminate();
    }
  }

  private async handleHeartbeat(message: z.infer<typeof Message>) {
    try {
      const heartbeat = HeartbeatInfo.parse(message.payload);
      this.lastHeartbeat = heartbeat;
      this.emit('heartbeat', heartbeat);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid heartbeat message';
      loggerLoggingManager.getInstance().();
    }
  }

  private handleClose() {
    this.cleanup();
    this.emit('disconnected', this.agentId);
    loggerLoggingManager.getInstance().();
  }

  private handleError(error: Error) {
    loggerLoggingManager.getInstance().();
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
      loggerLoggingManager.getInstance().();
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


