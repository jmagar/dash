import { Socket } from 'socket.io';
import { WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { ConnectionService } from './connection.service';
import { MetricsService } from './metrics.service';
import { MessageHandler } from './message.handler';
import { LoggingManager } from '../../../managers/LoggingManager';
import { SystemMetrics } from '../../../../types/metrics.types';

interface AgentInfo {
  id: string;
  version: string;
  status: 'online' | 'offline' | 'error';
  lastSeen: string;
}

interface Agent {
  info: AgentInfo;
  connection: Socket | WebSocket;
}

export class AgentService extends EventEmitter {
  private static instance: AgentService;
  private readonly agents = new Map<string, Agent>();
  private readonly logger = LoggingManager.getInstance();

  private constructor(
    private readonly io: Socket,
    private readonly connectionService: ConnectionService,
    private readonly messageHandler: MessageHandler,
    private readonly metricsService: MetricsService
  ) {
    super();
  }

  public static initialize(
    io: Socket,
    connectionService: ConnectionService,
    messageHandler: MessageHandler,
    metricsService: MetricsService
  ): AgentService {
    if (!AgentService.instance) {
      AgentService.instance = new AgentService(io, connectionService, messageHandler, metricsService);
    }
    return AgentService.instance;
  }

  public static getInstance(): AgentService {
    if (!AgentService.instance) {
      throw new Error('AgentService must be initialized first');
    }
    return AgentService.instance;
  }

  public async handleSocketConnection(socket: Socket): Promise<void> {
    try {
      const connectionResult = await this.connectionService.handleSocketIOConnection(socket);
      
      if (connectionResult.success && connectionResult.data) {
        const agentInfo = connectionResult.data;
        this.registerAgent(socket, agentInfo);
      }
    } catch (error: unknown) {
      this.logger.error('Failed to handle socket connection', {
        error: error instanceof Error ? error.message : 'Unknown error',
        socketId: socket.id
      });
    }
  }

  private registerAgent(connection: Socket | WebSocket, info: AgentInfo): void {
    const agent: Agent = {
      info,
      connection
    };

    this.agents.set(info.id, agent);
    this.emit('agent:connected', info);
  }

  public isConnected(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  public getAgentMetrics(agentId: string): Record<string, unknown> | undefined {
    const agent = this.getAgent(agentId);
    if (!agent) return undefined;

    const metrics = this.metricsService.getMetricsForAgent(agentId);
    if (!metrics) return undefined;

    return {
      cpu: metrics.cpu,
      memory: metrics.memory,
      storage: metrics.storage,
      network: metrics.network,
      uptime: metrics.uptime,
      loadAverage: metrics.loadAverage,
      timestamp: metrics.timestamp,
      createdAt: metrics.createdAt,
      updatedAt: metrics.updatedAt
    };
  }

  private getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  public async disconnectAgent(agentId: string): Promise<void> {
    const agent = this.getAgent(agentId);
    if (agent) {
      await this.connectionService.closeConnection(agentId);
      this.agents.delete(agentId);
      this.emit('agent:disconnected', agent.info);
    }
  }
}
