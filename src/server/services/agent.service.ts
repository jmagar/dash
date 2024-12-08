import { Server as SocketServer, Socket, Namespace } from 'socket.io';
import { EventEmitter } from 'events';
import { LoggingManager } from '../managers/LoggingManager';
import { AgentStatus } from '../../types/agent-config';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  AgentInfo,
  AgentMetrics,
  LogFilter,
  LogEntry,
  SocketData
} from '../../types/socket-events';
import type {
  HostId,
  SessionId,
  ProcessId,
  BaseEventPayload,
  BaseSuccessPayload,
  BaseErrorPayload,
  HostEventPayload,
  ProcessEventPayload,
  TerminalEventPayload
} from '../../types/socket.io';
import type { ProcessInfo } from '../../types/metrics.types';

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
      socket.once('host:connect', (payload: Readonly<{ hostId: string }> & BaseEventPayload, callback: (response: BaseSuccessPayload | BaseErrorPayload) => void) => {
        try {
          this.handleRegistration(socket, { id: payload.hostId } as AgentInfo);
          callback({
            success: true,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          callback({
            success: false,
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : String(error)
          });
        }
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
    const hostId = id as unknown as HostId; // Cast string to HostId

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
    Object.defineProperty(socket.data, 'agentId', {
      value: id,
      writable: false,
      configurable: true,
      enumerable: true
    });

    // Setup agent event handlers
    this.setupAgentHandlers(socket, id);

    LoggingManager.getInstance().info('Agent registered', {
      agentId: id,
      hostname: info.hostname,
      version: info.version,
    });

    // Emit registration event
    this.emit('host:updated', {
      hostId,
      ...info
    });

    // Send command to acknowledge registration
    socket.emit('process:update', {
      hostId,
      process: {
        pid: 0,
        name: '',
        command: 'acknowledge',
        status: 'running',
        user: '',
        cpu: 0,
        memory: 0,
        threads: 0,
        fds: 0
      }
    });
  }

  private setupAgentHandlers(
    socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    agentId: string
  ): void {
    const hostId = agentId as unknown as HostId;

    // Handle metrics updates
    socket.on('host:connect', (payload: HostEventPayload) => {
      const agent = this.agents.get(agentId);
      if (agent) {
        agent.lastSeen = new Date();
        this.emit('process:metrics', {
          hostId,
          timestamp: new Date().toISOString(),
          processes: [{
            pid: 0,
            name: '',
            command: '',
            status: 'running',
            user: '',
            cpu: 0,
            memory: 0,
            threads: 0,
            fds: 0
          }]
        });
      }
    });

    // Handle command responses
    socket.on('process:monitor', (payload: HostEventPayload) => {
      this.emit('process:update', {
        hostId,
        timestamp: new Date().toISOString(),
        process: {
          pid: 0,
          name: '',
          command: '',
          status: 'running',
          user: '',
          cpu: 0,
          memory: 0,
          threads: 0,
          fds: 0
        }
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      LoggingManager.getInstance().error('Agent error', {
        agentId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      this.emit('error', errorMessage);
    });

    // Handle heartbeat
    socket.on('host:connect', (payload: Readonly<{ hostId: HostId }> & BaseEventPayload, callback: (response: BaseSuccessPayload | BaseErrorPayload) => void) => {
      const agent = this.agents.get(agentId);
      if (agent) {
        agent.lastSeen = new Date();
        this.emit('host:updated', {
          hostId,
          timestamp: new Date().toISOString(),
          id: agentId,
          version: agent.info.version,
          hostname: agent.info.hostname,
          platform: agent.info.platform,
          arch: agent.info.arch,
          lastSeen: new Date(),
          status: 'connected'
        });
        callback({
          success: true,
          timestamp: new Date().toISOString()
        });
      } else {
        callback({
          success: false,
          timestamp: new Date().toISOString(),
          error: 'Agent not found'
        });
      }
    });

    // Handle logs
    socket.on('terminal:join', (payload: TerminalEventPayload) => {
      this.emit('terminal:data', {
        hostId,
        sessionId: payload.sessionId,
        timestamp: new Date().toISOString(),
        data: ''
      });
    });
  }

  private handleDisconnect(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      LoggingManager.getInstance().info('Agent disconnected', { agentId });
      this.agents.delete(agentId);
      this.emit('host:disconnected', { hostId: agentId });
    }
  }

  /**
   * Subscribe agent to log streaming with filters
   */
  public async subscribeToLogs(agentId: string, filter?: LogFilter): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }
    await Promise.resolve(); // Ensure async context
    this.emit('terminal:data', {
      hostId: agentId,
      sessionId: '',
      data: JSON.stringify({ action: 'subscribe', filter })
    });
  }

  /**
   * Unsubscribe agent from log streaming
   */
  public async unsubscribeFromLogs(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }
    await Promise.resolve(); // Ensure async context
    this.emit('terminal:data', {
      hostId: agentId,
      sessionId: '',
      data: JSON.stringify({ action: 'unsubscribe' })
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
  public async executeCommand(agentId: string, command: string, args: string[] = []): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    const hostId = agentId as unknown as HostId;

    return new Promise((resolve, reject) => {
      const commandTimeout = setTimeout(() => {
        reject(new Error('Command acknowledgment timeout'));
      }, 5000);

      agent.socket.emit('process:monitor', {
        hostId,
        process: {
          pid: 0,
          name: '',
          command,
          args,
          status: 'running',
          user: '',
          cpu: 0,
          memory: 0,
          threads: 0,
          fds: 0
        }
      });

      agent.socket.once('process:update', () => {
        clearTimeout(commandTimeout);
        resolve();
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
