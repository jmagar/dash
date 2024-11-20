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

    ws.on('message', async (data: WebSocket.Data) => {
      try {
        const message = Message.parse(JSON.parse(data.toString()));
        
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
    });

    ws.on('close', () => {
      clearTimeout(timeout);
      this.onDisconnect(ws);
    });
  }

  // Reuse existing Socket.IO handler code
  handleSocketIO(socket: Socket): void {
    logger.debug('Browser client connected via Socket.IO');

    socket.on('agent:connected', async (data: { info: AgentInfo }) => {
      await this.onRegister(socket, data.info, 'socketio');
    });

    socket.on('agent:metrics', async (metrics: AgentMetrics) => {
      await this.onHeartbeat(metrics);
    });

    socket.on('disconnect', () => {
      this.onDisconnect(socket);
    });
  }

  // Send command to agent regardless of protocol
  sendCommand(agent: AgentState, command: string): void {
    const message = {
      type: 'command',
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      payload: { command }
    };

    if (agent.connectionType === 'ws') {
      (agent.connection as WebSocket).send(JSON.stringify(message));
    } else {
      (agent.connection as Socket).emit('agent:command', { command });
    }
  }
}
