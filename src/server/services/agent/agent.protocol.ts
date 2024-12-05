import { WebSocket, RawData } from 'ws';
import { Socket } from 'socket.io';
import type { 
  AgentMessage, 
  AgentInfo, 
  AgentMetrics, 
  AgentCommandResult,
  AgentOperationResult,
  ConnectionId,
  Brand,
  AgentConnection
} from './agent.types';
import { MessageParser } from './utils/message.parser';
import { MessageHandler } from './services/message.handler';
import { MetricsService } from './services/metrics.service';
import { ConnectionService } from './services/connection.service';
import { ERROR_CODES } from './utils/constants';
import { BaseService } from '../base.service';
import type { LogMetadata } from '../../../types/logger';
import { LoggingManager } from '../../managers/LoggingManager';

// Create branded type for connection IDs
function createConnectionId(id: string): ConnectionId {
  return id as Brand<string, 'ConnectionId'>;
}

export class ProtocolHandler extends BaseService {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  private static readonly logger = LoggingManager.getInstance();
  private readonly messageHandler: MessageHandler;

  constructor(
    metricsService: MetricsService,
    connectionService: ConnectionService
  ) {
    super({
      metricsEnabled: true,
      loggingEnabled: true
    });
    
    this.messageHandler = new MessageHandler(
      metricsService,
      connectionService
    );
  }

  async handleWebSocketMessage(ws: WebSocket, data: RawData): Promise<void> {
    const connectionId = createConnectionId(ws.url || crypto.randomUUID());
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const message = MessageParser.parse(data);
      if (!message) return;

      await this.messageHandler.handleWebSocketMessage(ws, connectionId, message);
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        data: data.toString(),
        connectionId: connectionId.toString()
      };
      ProtocolHandler.logger.error('Failed to handle WebSocket message', metadata);
    }
  }

  async handleSocketIOMessage(socket: Socket, message: AgentMessage): Promise<void> {
    const connectionId = createConnectionId(socket.id);
    
    try {
      await this.messageHandler.handleSocketIOMessage(socket, connectionId, message);
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        socketId: socket.id,
        connectionId: connectionId.toString()
      };
      ProtocolHandler.logger.error('Failed to handle Socket.IO message', metadata);
    }
  }

  handleWebSocketConnection(ws: WebSocket): AgentOperationResult<AgentInfo> {
    const connectionId = createConnectionId(ws.url || crypto.randomUUID());
    
    ProtocolHandler.logger.info('New WebSocket connection', { 
      connectionId: connectionId.toString() 
    });

    ws.on('message', (data: RawData) => {
      void this.handleWebSocketMessage(ws, data).catch((error: unknown) => {
        const metadata: LogMetadata = {
          error: error instanceof Error ? error.message : String(error),
          connectionId: connectionId.toString()
        };
        ProtocolHandler.logger.error('WebSocket message handler failed', metadata);
      });
    });

    ws.on('error', () => {
      const metadata: LogMetadata = {
        connectionId: connectionId.toString()
      };
      ProtocolHandler.logger.error('WebSocket error', metadata);
    });

    ws.on('close', (code: number, reason: Buffer) => {
      const metadata: LogMetadata = {
        code,
        reason: reason.toString(),
        connectionId: connectionId.toString()
      };
      ProtocolHandler.logger.info('WebSocket connection closed', metadata);
    });

    return {
      success: true,
      timestamp: new Date().toISOString() as Brand<string, 'Timestamp'>
    };
  }

  handleSocketIOConnection(socket: Socket): AgentOperationResult<AgentInfo> {
    const connectionId = createConnectionId(socket.id);
    
    ProtocolHandler.logger.info('New Socket.IO connection', {
      socketId: socket.id,
      connectionId: connectionId.toString()
    });

    socket.on('agent:register', (data: { info: AgentInfo }) => {
      void this.handleSocketIOMessage(socket, {
        type: 'register',
        payload: data.info
      }).catch((error: unknown) => {
        const metadata: LogMetadata = {
          error: error instanceof Error ? error.message : String(error),
          socketId: socket.id,
          connectionId: connectionId.toString()
        };
        ProtocolHandler.logger.error('Socket.IO register handler failed', metadata);
      });
    });

    socket.on('agent:heartbeat', (metrics: AgentMetrics) => {
      void this.handleSocketIOMessage(socket, {
        type: 'heartbeat',
        payload: metrics
      }).catch((error: unknown) => {
        const metadata: LogMetadata = {
          error: error instanceof Error ? error.message : String(error),
          socketId: socket.id,
          connectionId: connectionId.toString()
        };
        ProtocolHandler.logger.error('Socket.IO heartbeat handler failed', metadata);
      });
    });

    socket.on('agent:command_response', (result: AgentCommandResult) => {
      void this.handleSocketIOMessage(socket, {
        type: 'command_response',
        payload: result
      }).catch((error: unknown) => {
        const metadata: LogMetadata = {
          error: error instanceof Error ? error.message : String(error),
          socketId: socket.id,
          connectionId: connectionId.toString()
        };
        ProtocolHandler.logger.error('Socket.IO command response handler failed', metadata);
      });
    });

    socket.on('disconnect', (reason: string) => {
      const metadata: LogMetadata = {
        socketId: socket.id,
        reason,
        connectionId: connectionId.toString()
      };
      ProtocolHandler.logger.info('Socket.IO connection disconnected', metadata);
    });

    socket.on('error', (error: Error) => {
      const metadata: LogMetadata = {
        error: error.message,
        socketId: socket.id,
        connectionId: connectionId.toString()
      };
      ProtocolHandler.logger.error('Socket.IO error', metadata);
    });

    return {
      success: true,
      timestamp: new Date().toISOString() as Brand<string, 'Timestamp'>
    };
  }

  public async sendCommand(
    agentId: Brand<string, 'AgentId'>, 
    command: string, 
    args: readonly string[] = []
  ): Promise<AgentOperationResult<AgentCommandResult>> {
    const message: AgentMessage = {
      type: 'command',
      payload: {
        command,
        args
      }
    };

    try {
      // Create a mock connection that implements both WebSocket and Socket interfaces
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const mockConnection: AgentConnection = {
        send: () => Promise.resolve(),
        emit: () => false,
        on: () => mockConnection,
        once: () => mockConnection,
        off: () => mockConnection,
        removeListener: () => mockConnection,
        removeAllListeners: () => mockConnection,
        listeners: () => [],
        rawListeners: () => [],
        eventNames: () => [],
        listenerCount: () => 0,
        prependListener: () => mockConnection,
        prependOnceListener: () => mockConnection,
        setMaxListeners: () => mockConnection,
        getMaxListeners: () => 0,
        url: '',
        protocol: '',
        readyState: 0,
        bufferedAmount: 0,
        extensions: '',
        binaryType: 'nodebuffer',
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        close: (_code?: number, _data?: string | Buffer) => { /* noop */ },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ping: (_data?: Buffer | string | number, _mask?: boolean) => { /* noop */ },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        pong: (_data?: Buffer | string | number, _mask?: boolean) => { /* noop */ },
        terminate: () => { /* noop */ },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        addEventListener: (_event: string, _listener: (event: Event) => void) => { /* noop */ },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        removeEventListener: (_event: string, _listener: (event: Event) => void) => { /* noop */ },
        dispatchEvent: () => true
      } as unknown as AgentConnection;

      const connectionId = createConnectionId(crypto.randomUUID());
      await this.messageHandler.handleWebSocketMessage(mockConnection as WebSocket, connectionId, message);
      
      return {
        success: true,
        timestamp: new Date().toISOString() as Brand<string, 'Timestamp'>
      };
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        agentId: agentId.toString(),
        command
      };
      ProtocolHandler.logger.error('Failed to send command', metadata);

      return {
        success: false,
        error: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'Failed to send command',
          details: error instanceof Error ? error.message : String(error)
        },
        timestamp: new Date().toISOString() as Brand<string, 'Timestamp'>
      };
    }
  }
}
