import { WebSocket, WebSocketServer } from 'ws';
import { Server, Socket } from 'socket.io';
import { 
  ClientToServerEvents, 
  ServerToClientEvents, 
  InterServerEvents, 
  SocketData 
} from '../../../../types/socket-events';
import { logger } from '../../../utils/logger';
import { AgentConnection, AgentInfo, AgentOperationResult } from '../agent.types';
import { ProtocolHandler } from '../agent.protocol';
import { ApiError } from '../../../../types/error';
import { ERROR_CODES, LOG_METADATA, SOCKET_EVENTS, CONNECTION_TIMEOUT } from '../utils/constants';
import type { LogMetadata } from '../../../../types/logger';
import { z } from 'zod';
import { LoggingManager } from '../../../../../../../../../../../utils/logging/LoggingManager';

// Connection metadata schema with strict validation
const connectionMetadataSchema = z.object({
  connectionType: z.enum(['websocket', 'socketio']),
  socketId: z.string().optional(),
  agentId: z.string().uuid().optional(),
  remoteAddress: z.string().ip().optional()
}).readonly();

type ConnectionMetadata = z.infer<typeof connectionMetadataSchema>;

type SocketIOServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

type SocketIONamespace = ReturnType<SocketIOServer['of']>;

type SocketIOClient = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

interface ConnectionResult<T> extends AgentOperationResult<T> {
  metadata: ConnectionMetadata;
}

// Type guard for WebSocket connections
function isWebSocket(connection: AgentConnection): connection is WebSocket {
  return connection instanceof WebSocket;
}

// Type guard for Socket.IO connections
function isSocketIO(connection: AgentConnection): connection is SocketIOClient {
  return !isWebSocket(connection);
}

export class ConnectionService {
  private readonly protocolHandler: ProtocolHandler;
  private readonly wsServer?: WebSocketServer;
  private readonly socketNamespace?: SocketIONamespace;
  private readonly activeConnections: Map<string, {
    connection: AgentConnection;
    metadata: ConnectionMetadata;
  }>;

  constructor(
    protocolHandler: ProtocolHandler,
    wsServer?: WebSocketServer,
    io?: SocketIOServer
  ) {
    this.protocolHandler = protocolHandler;
    this.wsServer = wsServer;
    this.activeConnections = new Map();

    if (wsServer) {
      this.setupWebSocketServer();
    }

    if (io) {
      this.socketNamespace = io.of('/agent');
      this.setupSocketServer();
    }
  }

  private logError(error: unknown, metadata: ConnectionMetadata): void {
    const logMetadata: LogMetadata = {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      [LOG_METADATA.CONNECTION_TYPE]: metadata.connectionType,
      [LOG_METADATA.SOCKET_ID]: metadata.socketId,
      [LOG_METADATA.AGENT_ID]: metadata.agentId
    };

    if (error instanceof ApiError) {
      logMetadata.errorCode = error.code;
      logMetadata.errorDetails = error.details;
    }

    loggerLoggingManager.getInstance().();
  }

  private setupConnectionTimeout(
    connection: AgentConnection,
    metadata: ConnectionMetadata
  ): NodeJS.Timeout {
    return setTimeout(() => {
      if (isWebSocket(connection)) {
        connection.terminate();
      } else {
        connection.emit('disconnect');
      }
      
      loggerLoggingManager.getInstance().();
    }, CONNECTION_TIMEOUT);
  }

  private async handleWebSocketMessage(ws: WebSocket): Promise<ConnectionResult<AgentInfo>> {
    const metadata = connectionMetadataSchema.parse({
      connectionType: 'websocket' as const,
      remoteAddress: (ws as WebSocket & { remoteAddress?: string }).remoteAddress
    });

    try {
      const result = await this.protocolHandler.handleWebSocketConnection(ws);
      if (result.success && result.data) {
        const agentId = result.data.id;
        this.activeConnections.set(agentId, { connection: ws, metadata: { ...metadata, agentId } });
        
        loggerLoggingManager.getInstance().();

        return {
          success: true,
          data: result.data,
          metadata,
          timestamp: new Date().toISOString()
        };
      }
      return {
        success: false,
        error: {
          code: ERROR_CODES.CONNECTION_ERROR,
          message: 'Protocol handler failed to establish connection'
        },
        metadata,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logError(error, metadata);
      ws.terminate();

      return {
        success: false,
        error: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'Failed to handle WebSocket message',
          details: error instanceof Error ? error.message : undefined
        },
        metadata,
        timestamp: new Date().toISOString()
      };
    }
  }

  private async handleSocketIOConnection(socket: SocketIOClient): Promise<ConnectionResult<AgentInfo>> {
    const metadata = connectionMetadataSchema.parse({
      connectionType: 'socketio' as const,
      socketId: socket.id,
      remoteAddress: socket.handshake.address
    });

    try {
      const result = await this.protocolHandler.handleSocketIOConnection(socket);
      if (result.success && result.data) {
        const agentId = result.data.id;
        this.activeConnections.set(agentId, { connection: socket, metadata: { ...metadata, agentId } });
        
        loggerLoggingManager.getInstance().();

        return {
          success: true,
          data: result.data,
          metadata,
          timestamp: new Date().toISOString()
        };
      }
      return {
        success: false,
        error: {
          code: ERROR_CODES.CONNECTION_ERROR,
          message: 'Protocol handler failed to establish connection'
        },
        metadata,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logError(error, metadata);
      return {
        success: false,
        error: {
          code: ERROR_CODES.CONNECTION_ERROR,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          details: error
        },
        metadata,
        timestamp: new Date().toISOString()
      };
    }
  }

  private setupWebSocketServer(): void {
    if (!this.wsServer) {
      throw new ApiError('WebSocket server not initialized', {
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }

    this.wsServer.on('connection', (ws: WebSocket) => {
      const metadata = connectionMetadataSchema.parse({
        connectionType: 'websocket' as const,
        remoteAddress: (ws as WebSocket & { remoteAddress?: string }).remoteAddress
      });

      try {
        loggerLoggingManager.getInstance().();

        const timeout = this.setupConnectionTimeout(ws, metadata);

        // Clear timeout on first message
        ws.once('message', () => {
          clearTimeout(timeout);
          void this.handleWebSocketMessage(ws);
        });

        // Handle disconnection
        ws.on('close', () => {
          const entry = Array.from(this.activeConnections.entries())
            .find(([_, { connection }]) => connection === ws);
          
          if (entry) {
            const [agentId, { metadata }] = entry;
            this.activeConnections.delete(agentId);
            loggerLoggingManager.getInstance().();
          }
        });

        // Handle errors
        ws.on('error', (error: Error) => {
          this.logError(error, metadata);
          ws.terminate();
        });
      } catch (error) {
        this.logError(error, metadata);
        ws.terminate();
      }
    });
  }

  private setupSocketServer(): void {
    if (!this.socketNamespace) {
      throw new ApiError('Socket.IO namespace not initialized', {
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }

    this.socketNamespace.on('connection', (socket: SocketIOClient) => {
      const metadata = connectionMetadataSchema.parse({
        connectionType: 'socketio' as const,
        socketId: socket.id,
        remoteAddress: socket.handshake.address
      });

      try {
        loggerLoggingManager.getInstance().();

        const timeout = this.setupConnectionTimeout(socket, metadata);

        // Clear timeout on first valid event
        const events = Object.values(SOCKET_EVENTS);
        events.forEach(event => {
          socket.once(event, () => {
            clearTimeout(timeout);
            void this.handleSocketIOConnection(socket);
          });
        });

        // Handle disconnection
        socket.on('disconnect', () => {
          const entry = Array.from(this.activeConnections.entries())
            .find(([_, { connection }]) => connection === socket);
          
          if (entry) {
            const [agentId, { metadata }] = entry;
            this.activeConnections.delete(agentId);
            loggerLoggingManager.getInstance().();
          }
        });

        // Handle errors
        socket.on('error', (error: Error) => {
          this.logError(error, metadata);
          socket.emit('disconnect');
        });
      } catch (error) {
        this.logError(error, metadata);
        socket.emit('disconnect');
      }
    });
  }

  public getConnection(agentId: string): AgentOperationResult<AgentConnection> {
    const entry = this.activeConnections.get(agentId);
    if (!entry) {
      return {
        success: false,
        error: {
          message: 'Agent connection not found',
          code: ERROR_CODES.AGENT_NOT_FOUND,
          details: { agentId }
        },
        timestamp: new Date().toISOString()
      };
    }

    return {
      success: true,
      data: entry.connection,
      timestamp: new Date().toISOString()
    };
  }

  public async closeConnection(agentId: string): Promise<AgentOperationResult<void>> {
    const entry = this.activeConnections.get(agentId);
    if (!entry) {
      return {
        success: false,
        error: {
          message: 'Agent connection not found',
          code: ERROR_CODES.AGENT_NOT_FOUND,
          details: { agentId }
        },
        timestamp: new Date().toISOString()
      };
    }

    const { connection, metadata } = entry;

    try {
      if (isWebSocket(connection)) {
        connection.terminate();
      } else {
        connection.emit('disconnect');
      }

      this.activeConnections.delete(agentId);
      return {
        success: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logError(error, metadata);

      return {
        success: false,
        error: {
          message: 'Failed to close connection',
          code: ERROR_CODES.INTERNAL_ERROR,
          details: error instanceof Error ? error.message : undefined
        },
        timestamp: new Date().toISOString()
      };
    }
  }
}

