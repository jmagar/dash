import { WebSocket } from 'ws';
import { Socket } from 'socket.io';
import { BaseService } from '../base.service';
import { ProtocolHandler } from './agent.protocol';
import { 
  AgentState, 
  AgentMetrics, 
  ICacheService, 
  AgentInfo, 
  agentInfoSchema,
  AgentServiceMetrics 
} from './agent.types';
import { AgentStatus } from '../../../types/agent-config';
import type { AgentCommandResult } from '../../../types/socket-events';
import type { LogMetadata } from '../../../types/logger';
import { ApiError } from '../../../types/error';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const AGENT_CACHE_TTL = 3600; // 1 hour
const AGENT_METRICS_TTL = 300; // 5 minutes
const STALE_THRESHOLD = 300000; // 5 minutes

export class AgentService extends BaseService {
  private readonly protocolHandler: ProtocolHandler;
  private readonly agents: Map<string, AgentState> = new Map();
  protected readonly cache?: ICacheService;
  private readonly prisma: PrismaClient;

  constructor() {
    super({
      retryOptions: {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 5000,
        factor: 2,
      },
      metricsEnabled: true,
      validation: {
        schema: agentInfoSchema,
      },
    });

    this.prisma = new PrismaClient();
    this.protocolHandler = new ProtocolHandler(
      this.handleAgentRegistration.bind(this),
      this.handleAgentHeartbeat.bind(this),
      this.handleAgentDisconnect.bind(this),
      this.handleCommandResponse.bind(this)
    );

    // Start periodic cleanup of stale agents
    setInterval(() => {
      void this.cleanup();
    }, 60000);
  }

  async getAgent(agentId: string): Promise<AgentInfo | null> {
    try {
      const cachedAgent = await this.cache?.get<AgentInfo>(`agent:${agentId}`);
      if (cachedAgent) {
        return cachedAgent;
      }

      const agent = await this.prisma.agent.findUnique({
        where: { id: agentId },
      });

      if (!agent) {
        return null;
      }

      const agentInfo: AgentInfo = {
        id: agent.id,
        name: agent.name,
        version: agent.version,
        status: agent.status as AgentStatus,
        lastSeen: agent.lastSeen,
        metadata: agent.metadata as Record<string, unknown>,
      };

      await this.cache?.set(`agent:${agentId}`, agentInfo, AGENT_CACHE_TTL);
      return agentInfo;
    } catch (error) {
      this.logger.error('Failed to get agent', { error, agentId });
      throw new ApiError('Failed to get agent', error);
    }
  }

  async getAgentStatus(agentId: string): Promise<AgentStatus> {
    const agent = await this.getAgent(agentId);
    if (!agent) {
      throw new ApiError('Agent not found', { agentId });
    }
    return agent.status;
  }

  async getAgentConnection(agentId: string): Promise<WebSocket | null> {
    const state = this.agents.get(agentId);
    if (!state || !state.connection) {
      return null;
    }
    return state.connection;
  }

  async executeCommand(agentId: string, command: string, args: string[] = []): Promise<AgentCommandResult> {
    const connection = await this.getAgentConnection(agentId);
    if (!connection) {
      throw new ApiError('Agent not connected', { agentId });
    }

    try {
      const result = await this.protocolHandler.sendCommand(connection, {
        command,
        args,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to execute command', { error, agentId, command, args });
      throw new ApiError('Failed to execute command', error);
    }
  }

  async updateAgentMetrics(agentId: string, metrics: AgentMetrics): Promise<void> {
    try {
      const agent = await this.getAgent(agentId);
      if (!agent) {
        throw new ApiError('Agent not found', { agentId });
      }

      await this.prisma.agent.update({
        where: { id: agentId },
        data: {
          metrics: metrics as any,
          lastSeen: new Date(),
        },
      });

      await this.cache?.set(`agent:metrics:${agentId}`, metrics, AGENT_METRICS_TTL);
    } catch (error) {
      this.logger.error('Failed to update agent metrics', { error, agentId });
      throw new ApiError('Failed to update agent metrics', error);
    }
  }

  private async handleAgentRegistration(socket: WebSocket, info: AgentInfo): Promise<void> {
    try {
      const existingAgent = await this.getAgent(info.id);
      if (existingAgent) {
        await this.prisma.agent.update({
          where: { id: info.id },
          data: {
            status: AgentStatus.CONNECTED,
            lastSeen: new Date(),
            version: info.version,
            metadata: info.metadata as any,
          },
        });
      } else {
        await this.prisma.agent.create({
          data: {
            id: info.id,
            name: info.name,
            version: info.version,
            status: AgentStatus.CONNECTED,
            lastSeen: new Date(),
            metadata: info.metadata as any,
          },
        });
      }

      this.agents.set(info.id, {
        info,
        connection: socket,
        lastSeen: Date.now(),
      });

      await this.cache?.set(`agent:${info.id}`, info, AGENT_CACHE_TTL);
    } catch (error) {
      this.logger.error('Failed to handle agent registration', { error, agentId: info.id });
      throw new ApiError('Failed to handle agent registration', error);
    }
  }

  private async handleAgentHeartbeat(agentId: string): Promise<void> {
    const state = this.agents.get(agentId);
    if (state) {
      state.lastSeen = Date.now();
      await this.prisma.agent.update({
        where: { id: agentId },
        data: {
          lastSeen: new Date(),
          status: AgentStatus.CONNECTED,
        },
      });
    }
  }

  private async handleAgentDisconnect(agentId: string): Promise<void> {
    const state = this.agents.get(agentId);
    if (state) {
      await this.prisma.agent.update({
        where: { id: agentId },
        data: {
          status: AgentStatus.DISCONNECTED,
        },
      });

      this.agents.delete(agentId);
      await this.cache?.del(`agent:${agentId}`);
    }
  }

  private async handleCommandResponse(agentId: string, result: AgentCommandResult): Promise<void> {
    const state = this.agents.get(agentId);
    if (state) {
      this.protocolHandler.handleCommandResponse(state.connection!, result);
    }
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    for (const [agentId, state] of this.agents.entries()) {
      if (now - state.lastSeen > STALE_THRESHOLD) {
        await this.handleAgentDisconnect(agentId);
      }
    }
  }

  async getMetrics(): Promise<AgentServiceMetrics> {
    const totalAgents = await this.prisma.agent.count();
    const connectedAgents = await this.prisma.agent.count({
      where: { status: AgentStatus.CONNECTED },
    });

    return {
      totalAgents,
      connectedAgents,
      disconnectedAgents: totalAgents - connectedAgents,
    };
  }

  handleWebSocket(ws: WebSocket): void {
    try {
      this.protocolHandler.handleWebSocket(ws);
    } catch (error) {
      this.handleError(error, { protocol: 'websocket' });
    }
  }

  handleSocketIO(socket: Socket): void {
    try {
      this.protocolHandler.handleSocketIO(socket);
    } catch (error) {
      this.handleError(error, { protocol: 'socketio' });
    }
  }
}
