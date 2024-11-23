import { WebSocket } from 'ws';
import { Socket } from 'socket.io';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import type { AgentInfo, AgentMetrics, AgentCommandResult } from '../../../types/socket-events';
import type { AgentState } from './agent.types';

// Reuse existing message schemas
export const MessageType = z.enum([
  'ping', 'pong', 'handshake', 'register',
  'command', 'command_response', 'heartbeat',
  'disconnect', 'error'
]);

export const Message = z.object({
  type: MessageType,
  id: z.string(),
  timestamp: z.string().datetime(),
  payload: z.record(z.any()).optional(),
});

type MessageData = z.infer<typeof Message>;

export class ProtocolHandler {
  constructor(
    private readonly onRegister: (connection: WebSocket | Socket, info: AgentInfo, type: 'ws' | 'socketio') => Promise<void>,
    private readonly onHeartbeat: (metrics: AgentMetrics) => Promise<void>,
    private readonly onDisconnect: (connection: WebSocket | Socket) => void,
    private readonly onCommandResponse: (result: AgentCommandResult) => void
  ) {}

  // Reuse existing WebSocket handler code
  handleWebSocket(ws: WebSocket): void {
    logger.debug('Agent attempting to connect via WebSocket');

    const timeout = setTimeout(() => {
      ws.terminate();
      logger.warn('Agent WebSocket connection timed out during registration');
    }, 5000);

    ws.on('message', (data: Buffer) => {
      void this.handleWebSocketMessage(ws, data, timeout);
    });

    ws.on('close', () => {
      clearTimeout(timeout);
      this.onDisconnect(ws);
    });
  }

  private async handleWebSocketMessage(ws: WebSocket, data: Buffer, timeout: NodeJS.Timeout): Promise<void> {
    try {
      const parsed = JSON.parse(data.toString()) as MessageData;
      const message = Message.parse(parsed);
      
      switch (message.type) {
        case 'register':
          clearTimeout(timeout);
          await this.onRegister(ws, message.payload as AgentInfo, 'ws');
          break;
        case 'heartbeat':
          await this.onHeartbeat(message.payload as AgentMetrics);
          break;
        case 'command_response':
          this.onCommandResponse(message.payload as AgentCommandResult);
          break;
      }
    } catch (error) {
      logger.error('Error handling WebSocket message', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Reuse existing Socket.IO handler code
  handleSocketIO(socket: Socket): void {
    logger.debug('Browser client connected via Socket.IO');

    socket.on('agent:connected', (data: { info: AgentInfo }) => {
      void this.onRegister(socket, data.info, 'socketio');
    });

    socket.on('agent:metrics', (metrics: AgentMetrics) => {
      void this.onHeartbeat(metrics);
    });

    socket.on('disconnect', () => {
      this.onDisconnect(socket);
    });
  }

  // Send command to agent regardless of protocol
  async sendCommand(agent: AgentState, command: string): Promise<void> {
    const message = {
      type: 'command' as const,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      payload: { command }
    };

    return new Promise<void>((resolve, reject) => {
      try {
        if (agent.connectionType === 'ws') {
          const ws = agent.connection as WebSocket;
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify(message), (error) => {
              if (error) {
                reject(error);
              } else {
                resolve();
              }
            });
          } else {
            reject(new Error('WebSocket connection is not open'));
          }
        } else {
          const socket = agent.connection as Socket;
          if (socket.connected) {
            socket.emit('agent:command', { command }, () => {
              resolve();
            });
          } else {
            reject(new Error('Socket.IO connection is not open'));
          }
        }
      } catch (error) {
        reject(error);
      }
    });
  }
}
