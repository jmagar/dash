import { Socket } from 'socket.io';
import { WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { LoggingManager } from '../../../managers/LoggingManager';
import { ERROR_CODES } from '../utils/constants';

// Branded types for type safety
type AgentId = string & { readonly __brand: 'AgentId' };
type Timestamp = string & { readonly __brand: 'Timestamp' };

interface AgentInfo {
  id: AgentId;
  version: string;
  status: 'online' | 'offline' | 'error';
  lastSeen: Timestamp;
}

interface Connection {
  id: AgentId;
  socket: Socket | WebSocket;
  type: 'socket.io' | 'websocket';
  lastSeen: Timestamp;
  metadata: {
    connectionType: string;
    socketId: string;
    error: string | null;
  };
}

export class ConnectionService extends EventEmitter {
  private readonly connections = new Map<string, Connection>();
  private readonly logger = LoggingManager.getInstance();

  public async handleSocketIOConnection(socket: Socket): Promise<{ success: boolean; data?: AgentInfo }> {
    try {
      const agentId = socket.handshake.query.agentId as string;
      if (!agentId) {
        throw new Error('Missing agentId in connection request');
      }

      await this.validateAgent(agentId);

      const connection: Connection = {
        id: agentId as AgentId,
        socket,
        type: 'socket.io',
        lastSeen: new Date().toISOString() as Timestamp,
        metadata: {
          connectionType: 'socket.io',
          socketId: socket.id,
          error: null
        }
      };

      this.connections.set(agentId, connection);

      socket.on('disconnect', () => {
        this.removeConnection(agentId);
      });

      socket.on('error', (error: Error) => {
        this.handleError(error, agentId);
      });

      const agentInfo: AgentInfo = {
        id: agentId as AgentId,
        version: socket.handshake.query.version as string || '1.0.0',
        status: 'online',
        lastSeen: new Date().toISOString() as Timestamp
      };

      return { success: true, data: agentInfo };
    } catch (error) {
      this.logger.error('Failed to handle socket.io connection:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        socketId: socket.id
      });
      return { success: false };
    }
  }

  public async handleWebSocketConnection(ws: WebSocket, agentId: string): Promise<void> {
    try {
      await this.validateAgent(agentId);

      const connection: Connection = {
        id: agentId as AgentId,
        socket: ws,
        type: 'websocket',
        lastSeen: new Date().toISOString() as Timestamp,
        metadata: {
          connectionType: 'websocket',
          socketId: ws.url || 'unknown',
          error: null
        }
      };

      this.connections.set(agentId, connection);

      ws.on('close', () => {
        this.removeConnection(agentId);
      });

      ws.on('error', (error: Error) => {
        this.handleError(error, agentId);
      });
    } catch (error) {
      this.logger.error('Failed to handle WebSocket connection:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        agentId
      });
      throw error;
    }
  }

  public async sendMessage(agentId: string, event: string, data: unknown): Promise<void> {
    const connection = this.connections.get(agentId);
    if (!connection) {
      throw new Error(`No connection found for agent ${agentId}`);
    }

    try {
      if (connection.type === 'socket.io') {
        const socket = connection.socket as Socket;
        await new Promise<void>((resolve, reject) => {
          socket.emit(event, data, (error?: Error) => {
            if (error) reject(error);
            else resolve();
          });
        });
      } else {
        const ws = connection.socket as WebSocket;
        await new Promise<void>((resolve, reject) => {
          ws.send(JSON.stringify({ type: event, payload: data }), (error?: Error) => {
            if (error) reject(error);
            else resolve();
          });
        });
      }

      this.logger.debug('Message sent successfully', {
        agentId,
        event,
        connectionType: connection.type
      });
    } catch (error) {
      this.handleError(error, agentId);
      throw error;
    }
  }

  public async closeConnection(agentId: string): Promise<void> {
    const connection = this.connections.get(agentId);
    if (!connection) return;

    try {
      if (connection.type === 'socket.io') {
        await new Promise<void>((resolve) => {
          (connection.socket as Socket).disconnect(true);
          resolve();
        });
      } else {
        await new Promise<void>((resolve) => {
          (connection.socket as WebSocket).close();
          resolve();
        });
      }
      this.removeConnection(agentId);
    } catch (error) {
      this.handleError(error, agentId);
      throw error;
    }
  }

  private removeConnection(agentId: string): void {
    const connection = this.connections.get(agentId);
    if (!connection) return;

    this.logger.info('Connection removed', {
      connectionType: connection.type,
      socketId: connection.metadata.socketId,
      agentId
    });

    this.connections.delete(agentId);
    this.emit('connection:removed', { agentId });
  }

  private handleError(error: unknown, agentId: string): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const connection = this.connections.get(agentId);
    
    if (connection) {
      connection.metadata.error = errorMessage;
    }

    this.logger.error('Connection error:', {
      error: errorMessage,
      agentId,
      connectionType: connection?.type
    });

    this.emit('connection:error', { agentId, error: errorMessage });
  }

  private async validateAgent(agentId: string): Promise<void> {
    // Add any async validation logic here
    await Promise.resolve();
    if (!agentId || typeof agentId !== 'string') {
      throw new Error('Invalid agent ID');
    }
  }
}
