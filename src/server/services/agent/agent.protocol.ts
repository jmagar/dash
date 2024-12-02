import { WebSocket } from 'ws';
import { Socket } from 'socket.io';
import { logger } from '../../utils/logger';
import type { AgentCommandResult, AgentInfo, AgentMetrics } from './agent.types';
import { MessageData } from './types/message.types';
import { MessageParser } from './utils/message.parser';
import { MessageHandler } from './services/message.handler';

export class ProtocolHandler {
  private readonly messageHandler: MessageHandler;

  constructor(
    private readonly onRegister: (info: AgentInfo) => Promise<void>,
    private readonly onHeartbeat: (metrics: AgentMetrics) => Promise<void>,
    private readonly onDisconnect: (connection: WebSocket | Socket) => void,
    private readonly onCommandResponse: (result: AgentCommandResult) => void
  ) {
    this.messageHandler = new MessageHandler(
      onRegister,
      onHeartbeat,
      onDisconnect,
      onCommandResponse
    );
  }

  async handleWebSocketMessage(ws: WebSocket, data: WebSocket.RawData): Promise<void> {
    try {
      const message = MessageParser.parse(data);
      if (!message) return;

      await this.messageHandler.handleMessage(message, ws);
    } catch (error) {
      logger.error('Error handling WebSocket message:', {
        error: error instanceof Error ? error.message : String(error),
        data: data.toString()
      });
    }
  }

  async handleSocketIOMessage(socket: Socket, message: MessageData): Promise<void> {
    try {
      await this.messageHandler.handleMessage(message, socket);
    } catch (error) {
      logger.error('Error handling Socket.IO message:', {
        error: error instanceof Error ? error.message : String(error),
        socketId: socket.id
      });
    }
  }

  handleWebSocketConnection(ws: WebSocket): void {
    ws.on('message', (data: WebSocket.RawData) => {
      void this.handleWebSocketMessage(ws, data);
    });

    ws.on('error', (error: Error) => {
      logger.error('WebSocket error:', { error: error.message });
      this.onDisconnect(ws);
    });

    ws.on('close', (code: number, reason: Buffer) => {
      logger.debug('WebSocket closed:', { 
        code, 
        reason: reason.toString('utf8') 
      });
      this.onDisconnect(ws);
    });
  }

  handleSocketIOConnection(socket: Socket): void {
    logger.debug('Browser client connected via Socket.IO');

    socket.on('agent:register', (data: { info: AgentInfo }) => {
      void this.handleSocketIOMessage(socket, {
        type: 'register',
        id: socket.id,
        timestamp: new Date().toISOString(),
        payload: data
      });
    });

    socket.on('agent:heartbeat', (metrics: AgentMetrics) => {
      void this.handleSocketIOMessage(socket, {
        type: 'heartbeat',
        id: socket.id,
        timestamp: new Date().toISOString(),
        payload: { metrics }
      });
    });

    socket.on('agent:command_response', (result: AgentCommandResult) => {
      void this.handleSocketIOMessage(socket, {
        type: 'command_response',
        id: socket.id,
        timestamp: new Date().toISOString(),
        payload: { result }
      });
    });

    socket.on('disconnect', (reason: string) => {
      logger.debug('Socket.IO client disconnected:', { reason });
      this.onDisconnect(socket);
    });

    socket.on('error', (error: Error) => {
      logger.error('Socket.IO error:', { error: error.message });
      void this.handleSocketIOMessage(socket, {
        type: 'error',
        id: socket.id,
        timestamp: new Date().toISOString(),
        payload: { error: error.message }
      });
    });
  }

  public async sendCommand(agentId: string, command: string): Promise<void> {
    const message: MessageData = {
      type: 'command',
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      payload: {
        command,
        agentId
      }
    };

    try {
      await this.messageHandler.handleMessage(message, null as unknown as WebSocket | Socket);
    } catch (error) {
      logger.error('Failed to send command:', {
        error: error instanceof Error ? error.message : String(error),
        agentId,
        command
      });
      throw error;
    }
  }
}
