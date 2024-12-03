import { Server as SocketServer, Socket, Namespace } from 'socket.io';
import { EventEmitter } from 'events';
import { LoggingManager } from '../utils/logging/LoggingManager';
import { AgentStatus } from '../../types/agent-config';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  AgentInfo,
  AgentMetrics,
  AgentCommandResult,
  LogFilter,
  LogEntry,
  SocketData
} from '../../types/socket-events';

interface ConnectedAgent {
  socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
  info: AgentInfo;
  lastSeen: Date;
  metrics?: AgentMetrics;
}

class AgentService extends EventEmitter {
  private agents: Map<string, ConnectedAgent> = new Map();
  private namespace: Namespace<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

  constructor(io: SocketServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) {
    super();
    this.namespace = io.of('/agent');
    this.setupSocketServer();
  }

  private setupSocketServer(): void {
    this.namespace.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) => {
      LoggingManager.getInstance().debug('Agent attempting to connect');

      // Handle registration
      socket.once('agent:connected', (data: { info: AgentInfo }) => {
        this.handleRegistration(socket, data.info);
      });

      // Set connection timeout
      const timeout = setTimeout(() => {
        if (!socket.data.agentId) {
          LoggingManager.getInstance().warn('Agent failed to register in time');
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
    socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    info: AgentInfo
  ): void {
    const { id } = info;

    // Check if agent is already connected
    const existing = this.agents.get(id);
    if (existing) {
      LoggingManager.getInstance().info('Agent reconnecting, closing old connection', { agentId: id });
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

    LoggingManager.getInstance().info('Agent registered', {
      agentId: id,
      hostname: info.hostname,
      version: info.version,
    });

    // Emit registration event
    this.emit('agent:registered', info);

    // Send command to acknowledge registration
    socket.emit('agent:command', {
      command: 'acknowledge'
    });
  }

  private setupAgentHandlers(
    socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    agentId: string
  ): void {
    // Handle metrics updates
    socket.on('agent:metrics', (data: { metrics: AgentMetrics }) => {
      const agent = this.agents.get(agentId);
      if (agent) {
        agent.metrics = data.metrics;
        agent.lastSeen = new Date();
        this.emit('agent:metrics', { hostId: agentId, metrics: data.metrics });
      }
    });

    // Handle command responses
    socket.on('agent:command', (data: { command: string; args?: string[] }) => {
      this.emit('agent:commandResult', { agentId, result: { success: true, output: JSON.stringify(data) } });
    });

    // Handle errors
    socket.on('error', (error) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      LoggingManager.getInstance().error('Agent error', {
        agentId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      this.emit('agent:error', { hostId: agentId, error: errorMessage });
    });

    // Handle heartbeat
    socket.on('agent:heartbeat', (data: { timestamp: Date; load: number[] }) => {
      const agent = this.agents.get(agentId);
      if (agent) {
        agent.lastSeen = new Date();
        this.emit('agent:heartbeat', {
          hostId: agentId,
          info: {
            timestamp: data.timestamp,
            status: 'healthy'
          }
        });
      }
    });

    // Handle logs
    socket.on('logs:stream', (data: { logs: LogEntry[] }) => {
      this.emit('agent:logs', { hostId: agentId, logs: data.logs });
    });
  }

  private handleDisconnect(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      LoggingManager.getInstance().info('Agent disconnected', { agentId });
      this.agents.delete(agentId);
      this.emit('agent:disconnected', { hostId: agentId });
    }
  }

  /**
   * Subscribe agent to log streaming with filters
   */
  public async subscribeToLogs(agentId: string, filter?: LogFilter): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not connected`);
    }

    agent.socket.emit('logs:new', {
      id: '',
      timestamp: new Date(),
      level: 'info',
      message: 'Log subscription started',
      metadata: { filter }
    });
  }

  /**
   * Unsubscribe agent from log streaming
   */
  public async unsubscribeFromLogs(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not connected`);
    }

    agent.socket.emit('logs:error', {
      error: 'Log subscription ended'
    });
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
    args: string[] = []
  ): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not connected`);
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Command acknowledgment timeout'));
      }, 5000);

      agent.socket.emit('agent:command', {
        command,
        args
      });
      resolve();
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

let agentServiceInstance: AgentService | null = null;

export function initializeAgentService(io: SocketServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>): AgentService {
  if (!agentServiceInstance) {
    agentServiceInstance = new AgentService(io);
  }
  return agentServiceInstance;
}

export const getAgentService = (): AgentService => {
  if (!agentServiceInstance) {
    throw new Error('AgentService not initialized');
  }
  return agentServiceInstance;
};

