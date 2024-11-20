import { Server as SocketServer, Socket, Namespace } from 'socket.io';
import { WebSocket, Server as WebSocketServer } from 'ws';
import { EventEmitter } from 'events';
import { z } from 'zod';
import { BaseService } from './base.service';
import { logger } from '../utils/logger';
import { AgentStatus } from '../../types/agent-config';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  AgentInfo,
  AgentMetrics,
  AgentCommandResult
} from '../../types/socket-events';
import type { Host } from '../../types/models-shared';

// Shared agent state regardless of connection type
interface AgentState {
  id: string;
  info: AgentInfo;
  lastSeen: Date;
  metrics?: AgentMetrics;
  status: AgentStatus;
  // Connection can be either WebSocket or Socket.IO
  connection: WebSocket | Socket;
  connectionType: 'ws' | 'socketio';
}

// Message schemas for WebSocket protocol
const MessageType = z.enum([
  'ping',
  'pong',
  'handshake',
  'register',
  'command',
  'command_response',
  'heartbeat',
  'disconnect',
  'error'
]);

const Message = z.object({
  type: MessageType,
  id: z.string(),
  timestamp: z.string().datetime(),
  payload: z.record(z.any()).optional(),
});

export class UnifiedAgentService extends BaseService {
  private agents: Map<string, AgentState> = new Map();
  private wsServer: WebSocketServer;
  private browserNamespace: Namespace<ClientToServerEvents, ServerToClientEvents, InterServerEvents>;

  constructor(
    wsServer: WebSocketServer,
    io: SocketServer
  ) {
    super();
    this.wsServer = wsServer;
    this.browserNamespace = io.of('/agent');
    this.setupWebSocketServer();
    this.setupSocketIOServer();
  }

  /**
   * Setup WebSocket server for agent connections
   */
  private setupWebSocketServer(): void {
    this.wsServer.on('connection', (ws: WebSocket) => {
      logger.debug('Agent attempting to connect via WebSocket');

      // Set connection timeout
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
              await this.handleAgentRegistration(ws, message.payload as AgentInfo, 'ws');
              break;
            case 'heartbeat':
              await this.handleAgentHeartbeat(message.payload as AgentMetrics);
              break;
            case 'command_response':
              this.handleCommandResponse(message.payload as AgentCommandResult);
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
        this.handleAgentDisconnection(ws);
      });
    });
  }

  /**
   * Setup Socket.IO server for browser connections
   */
  private setupSocketIOServer(): void {
    this.browserNamespace.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
      logger.debug('Browser client connected via Socket.IO');

      socket.on('agent:command', async (data) => {
        const agent = this.agents.get(data.agentId);
        if (!agent) {
          socket.emit('agent:error', { message: 'Agent not found' });
          return;
        }

        try {
          await this.sendCommandToAgent(agent, data.command);
          socket.emit('agent:command:sent', { agentId: data.agentId });
        } catch (error) {
          socket.emit('agent:error', {
            message: error instanceof Error ? error.message : 'Failed to send command'
          });
        }
      });
    });
  }

  /**
   * Handle agent registration from either connection type
   */
  private async handleAgentRegistration(
    connection: WebSocket | Socket,
    info: AgentInfo,
    connectionType: 'ws' | 'socketio'
  ): Promise<void> {
    const { id } = info;

    // Check if agent is already connected
    const existing = this.agents.get(id);
    if (existing) {
      logger.info('Agent reconnecting, closing old connection', { agentId: id });
      if (existing.connectionType === 'ws') {
        (existing.connection as WebSocket).terminate();
      } else {
        (existing.connection as Socket).disconnect(true);
      }
    }

    // Store agent information
    this.agents.set(id, {
      id,
      info,
      lastSeen: new Date(),
      status: AgentStatus.Connected,
      connection,
      connectionType
    });

    logger.info('Agent registered', {
      agentId: id,
      hostname: info.hostname,
      connectionType
    });

    // Notify browser clients
    this.browserNamespace.emit('agent:status', {
      agentId: id,
      status: AgentStatus.Connected,
      info
    });
  }

  /**
   * Handle agent disconnection from either connection type
   */
  private handleAgentDisconnection(connection: WebSocket | Socket): void {
    for (const [id, agent] of this.agents.entries()) {
      if (agent.connection === connection) {
        this.agents.delete(id);
        logger.info('Agent disconnected', { agentId: id });

        // Notify browser clients
        this.browserNamespace.emit('agent:status', {
          agentId: id,
          status: AgentStatus.Disconnected
        });
        break;
      }
    }
  }

  /**
   * Handle agent heartbeat/metrics
   */
  private async handleAgentHeartbeat(metrics: AgentMetrics): Promise<void> {
    const agent = this.agents.get(metrics.agentId);
    if (!agent) {
      logger.warn('Received heartbeat from unknown agent', {
        agentId: metrics.agentId
      });
      return;
    }

    agent.lastSeen = new Date();
    agent.metrics = metrics;

    // Notify browser clients
    this.browserNamespace.emit('agent:metrics', metrics);
  }

  /**
   * Handle command response from agent
   */
  private handleCommandResponse(result: AgentCommandResult): void {
    this.browserNamespace.emit('agent:command:result', result);
  }

  /**
   * Send command to agent
   */
  private async sendCommandToAgent(agent: AgentState, command: string): Promise<void> {
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

  /**
   * Install agent on a host
   */
  async installAgent(host: Host, options: { version: string }): Promise<void> {
    return this.withSSH(host, async (ssh) => {
      // Implementation moved from agent-installer.ts
      // TODO: Implement agent installation
    });
  }

  /**
   * Get list of connected agents
   */
  getConnectedAgents(): AgentInfo[] {
    return Array.from(this.agents.values()).map(agent => agent.info);
  }

  /**
   * Get agent metrics
   */
  getAgentMetrics(agentId: string): AgentMetrics | undefined {
    return this.agents.get(agentId)?.metrics;
  }
}

// Singleton instance
let unifiedAgentServiceInstance: UnifiedAgentService | null = null;

export function initializeAgentService(wsServer: WebSocketServer, io: SocketServer): UnifiedAgentService {
  if (!unifiedAgentServiceInstance) {
    unifiedAgentServiceInstance = new UnifiedAgentService(wsServer, io);
  }
  return unifiedAgentServiceInstance;
}

export function getAgentService(): UnifiedAgentService {
  if (!unifiedAgentServiceInstance) {
    throw new Error('Agent service not initialized');
  }
  return unifiedAgentServiceInstance;
}
