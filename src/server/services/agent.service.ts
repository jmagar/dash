import { Server as SocketServer, Socket, Namespace } from 'socket.io';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import {
  AgentStatus,
  AgentInfo,
  AgentMetrics,
  AgentCommand,
  AgentCommandResult,
  AgentHeartbeat,
  ServerToAgentEvents,
  AgentToServerEvents,
} from '../../types/agent-config';

interface ConnectedAgent {
  socket: Socket<AgentToServerEvents, ServerToAgentEvents>;
  info: AgentInfo;
  lastSeen: Date;
  metrics?: AgentMetrics;
}

class AgentService extends EventEmitter {
  private agents: Map<string, ConnectedAgent> = new Map();
  private namespace: Namespace<AgentToServerEvents, ServerToAgentEvents>;

  constructor(io: SocketServer) {
    super();
    this.namespace = io.of('/agent');
    this.setupSocketServer();
  }

  private setupSocketServer(): void {
    this.namespace.on('connection', (socket: Socket<AgentToServerEvents, ServerToAgentEvents>) => {
      logger.debug('Agent attempting to connect');

      // Handle registration
      socket.once('register', (info: AgentInfo) => {
        this.handleRegistration(socket, info);
      });

      // Set connection timeout
      const timeout = setTimeout(() => {
        if (!socket.data.agentId) {
          logger.warn('Agent failed to register in time');
          socket.disconnect(true);
        }
      }, 5000);

      socket.once('disconnect', () => {
        clearTimeout(timeout);
        if (socket.data.agentId) {
          this.handleDisconnect(socket.data.agentId);
        }
      });
    });
  }

  private handleRegistration(
    socket: Socket<AgentToServerEvents, ServerToAgentEvents>,
    info: AgentInfo
  ): void {
    const { id } = info;

    // Check if agent is already connected
    const existing = this.agents.get(id);
    if (existing) {
      logger.info('Agent reconnecting, closing old connection', { agentId: id });
      existing.socket.disconnect(true);
    }

    // Store agent information
    this.agents.set(id, {
      socket,
      info,
      lastSeen: new Date(),
    });

    // Store agent ID in socket data
    socket.data.agentId = id;

    // Setup agent event handlers
    this.setupAgentHandlers(socket, id);

    logger.info('Agent registered', {
      agentId: id,
      hostname: info.hostname,
      version: info.agentVersion,
    });

    // Emit registration event
    this.emit('agent:registered', info);

    // Send command to acknowledge registration
    this.executeCommand(id, 'acknowledge', [], { timeout: 5000 }).catch(error => {
      logger.error('Failed to acknowledge agent registration', {
        agentId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    });
  }

  private setupAgentHandlers(
    socket: Socket<AgentToServerEvents, ServerToAgentEvents>,
    agentId: string
  ): void {
    // Handle metrics updates
    socket.on('metrics', (metrics: AgentMetrics) => {
      const agent = this.agents.get(agentId);
      if (agent) {
        agent.metrics = metrics;
        agent.lastSeen = new Date();
        this.emit('agent:metrics', { agentId, metrics });
      }
    });

    // Handle command responses
    socket.on('commandResult', (result: AgentCommandResult) => {
      this.emit('agent:commandResult', { agentId, result });
    });

    // Handle errors
    socket.on('error', (err: Error) => {
      logger.error('Agent error', {
        agentId,
        error: err.message,
        stack: err.stack,
      });
      this.emit('agent:error', { agentId, error: err });
    });

    // Handle heartbeats
    socket.on('heartbeat', (heartbeat: AgentHeartbeat) => {
      const agent = this.agents.get(agentId);
      if (agent) {
        agent.lastSeen = new Date();
        this.emit('agent:heartbeat', { agentId, heartbeat });
      }
    });
  }

  private handleDisconnect(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      logger.info('Agent disconnected', { agentId });
      this.agents.delete(agentId);
      this.emit('agent:disconnected', agentId);
    }
  }

  /**
   * Get all connected agents
   */
  public getAgents(): Map<string, ConnectedAgent> {
    return this.agents;
  }

  /**
   * Get specific agent
   */
  public getAgent(agentId: string): ConnectedAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Execute command on agent
   */
  public async executeCommand(
    agentId: string,
    command: string,
    args: string[] = [],
    options: Partial<Omit<AgentCommand, 'id' | 'command' | 'args'>> = {}
  ): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not connected`);
    }

    return new Promise((resolve, reject) => {
      const cmd: AgentCommand = {
        id: Math.random().toString(36).substring(2, 15),
        command,
        args,
        ...options,
      };

      const timeout = setTimeout(() => {
        reject(new Error('Command acknowledgment timeout'));
      }, options.timeout || 5000);

      agent.socket.emit('command', cmd, (response: { status: string }) => {
        clearTimeout(timeout);
        if (response.status === 'accepted') {
          resolve();
        } else {
          reject(new Error(`Command rejected: ${response.status}`));
        }
      });
    });
  }

  /**
   * Check if agent is connected
   */
  public isConnected(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    return !!agent && agent.socket.connected;
  }

  /**
   * Get agent status
   */
  public getAgentStatus(agentId: string): AgentStatus {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return AgentStatus.UNKNOWN;
    }

    if (!agent.socket.connected) {
      return AgentStatus.DISCONNECTED;
    }

    const lastSeenDiff = Date.now() - agent.lastSeen.getTime();
    if (lastSeenDiff > 60000) { // 1 minute
      return AgentStatus.ERROR;
    }

    return AgentStatus.CONNECTED;
  }

  /**
   * Get agent metrics
   */
  public getAgentMetrics(agentId: string): AgentMetrics | undefined {
    return this.agents.get(agentId)?.metrics;
  }

  /**
   * Send ping to all agents
   */
  public ping(): void {
    this.namespace.emit('ping');
  }

  /**
   * Disconnect agent
   */
  public disconnectAgent(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.socket.disconnect(true);
    }
  }

  /**
   * Shutdown service
   */
  public shutdown(): void {
    for (const [agentId, agent] of this.agents) {
      agent.socket.disconnect(true);
      this.agents.delete(agentId);
    }
  }
}

// Export singleton instance
export const agentService = new AgentService(global.io);
