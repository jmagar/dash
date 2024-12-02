import { WebSocket } from 'ws';
import { Socket, Server } from 'socket.io';
import { 
  ClientToServerEvents, 
  ServerToClientEvents, 
  InterServerEvents, 
  SocketData 
} from '../../../types/socket-events';
import { BaseService } from '../base.service';
import { ProtocolHandler } from './agent.protocol';
import { 
  AgentInfo, 
  AgentMetrics,
  AgentCommandResult, 
  ICacheService, 
  AgentOperationResult,
  AgentServiceMetrics
} from './agent.types';
import { AgentStatus } from '../../../types/agent-config';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { ApiError } from '../../../types/error';
import { ConnectionService } from './services/connection.service';
import { MetricsService } from './services/metrics.service';
import { StateService } from './services/state.service';
import { handleApiError } from './utils/error.handler';

const STALE_THRESHOLD = 300000; // 5 minutes

export class AgentService extends BaseService {
  private readonly protocolHandler: ProtocolHandler;
  private readonly connectionService: ConnectionService;
  private readonly metricsService: MetricsService;
  private readonly stateService: StateService;

  constructor(
    wsServer?: WebSocket.Server,
    io?: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    cache?: ICacheService
  ) {
    super({
      retryOptions: {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 5000,
        factor: 2,
      },
      metricsEnabled: true
    });

    const prisma = new PrismaClient();

    this.protocolHandler = new ProtocolHandler(
      this.handleAgentRegistration.bind(this),
      this.handleAgentHeartbeat.bind(this),
      this.handleAgentDisconnect.bind(this),
      this.handleCommandResponse.bind(this)
    );

    this.connectionService = new ConnectionService(this.protocolHandler, wsServer, io);
    this.metricsService = new MetricsService(prisma);
    this.stateService = new StateService(prisma, cache);

    // Start periodic cleanup of stale agents
    setInterval(() => {
      void this.cleanup();
    }, STALE_THRESHOLD);
  }

  async getAgent(agentId: string): Promise<AgentOperationResult<AgentInfo>> {
    return this.stateService.getAgent(agentId);
  }

  async getAgentStatus(agentId: string): Promise<AgentStatus> {
    const agent = await this.getAgent(agentId);
    if (!agent.success) {
      throw new ApiError('Agent not found', { agentId });
    }
    return agent.data.status;
  }

  async executeCommand(agentId: string, command: string, args: string[] = []): Promise<AgentCommandResult> {
    try {
      const agent = await this.getAgent(agentId);
      if (!agent.success) {
        throw new ApiError('Agent not found', { agentId });
      }

      const result = await this.protocolHandler.sendCommand(agent.data, {
        command,
        args,
      });

      return result;
    } catch (error) {
      return handleApiError(error, 'Failed to execute command', { agentId, command, args });
    }
  }

  async updateAgentMetrics(agentId: string, metrics: AgentMetrics): Promise<void> {
    await this.metricsService.updateAgentMetrics(agentId, metrics);
  }

  private async handleAgentRegistration(socket: WebSocket | Socket, info: AgentInfo): Promise<void> {
    await this.stateService.registerAgent(info);
  }

  private async handleAgentHeartbeat(agentId: string): Promise<void> {
    try {
      await this.stateService.updateAgentState(agentId, {
        lastSeen: new Date()
      });
    } catch (error) {
      handleApiError(error, 'Failed to handle agent heartbeat', { agentId });
    }
  }

  private async handleAgentDisconnect(agentId: string): Promise<void> {
    await this.stateService.disconnectAgent(agentId);
  }

  private async handleCommandResponse(agentId: string, result: AgentCommandResult): Promise<void> {
    try {
      await this.protocolHandler.handleCommandResponse(agentId, result);
    } catch (error) {
      handleApiError(error, 'Failed to handle command response', { agentId, result });
    }
  }

  async cleanup(): Promise<void> {
    await this.stateService.cleanup();
  }

  async getMetrics(): Promise<AgentServiceMetrics> {
    return this.metricsService.getMetrics();
  }
}
