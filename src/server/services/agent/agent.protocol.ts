import { WebSocket } from 'ws';
import { Socket } from 'socket.io';
import { logger } from '../../utils/logger';
import type { AgentCommandResult, AgentInfo, AgentMetrics } from './agent.types';
import { MessageData } from './types/message.types';
import { MessageParser } from './utils/message.parser';
import { MessageHandler } from './services/message.handler';
import { LoggingManager } from '../../../../../../../../../../utils/logging/LoggingManager';

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
      loggerLoggingManager.getInstance().(),
        data: data.toString()
      });
    }
  }

  async handleSocketIOMessage(socket: Socket, message: MessageData): Promise<void> {
    try {
      await this.messageHandler.handleMessage(message, socket);
    } catch (error) {
      loggerLoggingManager.getInstance().(),
        socketId: socket.id
      });
    }
  }

  handleWebSocketConnection(ws: WebSocket): void {
    ws.on('message', (data: WebSocket.RawData) => {
      void this.handleWebSocketMessage(ws, data);
    });

    ws.on('error', (error: Error) => {
      loggerLoggingManager.getInstance().();
      this.onDisconnect(ws);
    });

    ws.on('close', (code: number, reason: Buffer) => {
      loggerLoggingManager.getInstance().() 
      });
      this.onDisconnect(ws);
    });
  }

  handleSocketIOConnection(socket: Socket): void {
    loggerLoggingManager.getInstance().();

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
      loggerLoggingManager.getInstance().();
      this.onDisconnect(socket);
    });

    socket.on('error', (error: Error) => {
      loggerLoggingManager.getInstance().();
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
      loggerLoggingManager.getInstance().(),
        agentId,
        command
      });
      throw error;
    }
  }
}

