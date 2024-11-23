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
      void this.cleanupStaleAgents();
    }, 60000);
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

  private async handleAgentRegistration(
    connection: WebSocket | Socket,
    info: AgentInfo,
    type: 'ws' | 'socketio'
  ): Promise<void> {
    const result = await this.executeOperation(
      {
        name: 'agent_registration',
        input: info,
        execute: async () => {
          // Validate agent info using zod schema
          const validatedInfo = await agentInfoSchema.parseAsync({
            ...info,
            status: AgentStatus.CONNECTED,
            lastSeen: new Date(),
          });
          
          // Store agent connection with metrics
          const agent: AgentState = {
            info: validatedInfo,
            connection,
            connectionType: type,
            lastHeartbeat: new Date(),
            status: AgentStatus.CONNECTED,
          };

          await this.prisma.$transaction(async (tx) => {
            await tx.agent.upsert({
              where: { id: validatedInfo.id },
              create: {
                id: validatedInfo.id,
                hostname: validatedInfo.hostname,
                platform: validatedInfo.platform,
                version: validatedInfo.version,
                status: AgentStatus.CONNECTED,
                lastHeartbeat: new Date(),
              },
              update: {
                hostname: validatedInfo.hostname,
                platform: validatedInfo.platform,
                version: validatedInfo.version,
                status: AgentStatus.CONNECTED,
                lastHeartbeat: new Date(),
              },
            });
          });

          this.agents.set(validatedInfo.id, agent);
          return agent;
        },
      },
      {
        metrics: {
          tags: {
            operation: 'agent_registration',
          },
        },
      }
    );

    this.emit('agent:registered', result.data);
    this.logger.info('Agent registered', {
      agentId: result.data.info.id,
      metrics: result.metrics,
    });
  }

  private async handleAgentHeartbeat(metrics: AgentMetrics): Promise<void> {
    await this.executeOperation(
      {
        name: 'agent_heartbeat',
        input: metrics,
        execute: async () => {
          const { agentId, metrics: agentMetrics } = metrics;
          if (!agentId) {
            throw new ApiError('Agent ID not provided', undefined, 400);
          }

          await this.prisma.$transaction(async (tx) => {
            const agent = await tx.agent.findUnique({
              where: { id: agentId },
            });

            if (!agent) {
              throw new ApiError('Agent not found', undefined, 404);
            }

            await tx.agent.update({
              where: { id: agentId },
              data: {
                lastHeartbeat: new Date(),
                status: AgentStatus.CONNECTED,
              },
            });
          });

          // Record agent metrics
          if (agentMetrics) {
            Object.entries(agentMetrics).forEach(([key, value]) => {
              if (typeof value === 'number') {
                this.recordMetric(`agent.${key}`, value, { agentId });
              }
            });
          }
        },
      },
      {
        metrics: {
          tags: {
            operation: 'agent_heartbeat',
          },
        },
      }
    );
  }

  private async handleAgentDisconnect(connection: WebSocket | Socket): Promise<void> {
    await this.executeOperation(
      {
        name: 'agent_disconnect',
        input: connection,
        execute: async () => {
          const agentId = Array.from(this.agents.entries())
            .find(([_, agent]) => agent.connection === connection)?.[0];

          if (agentId) {
            await this.prisma.$transaction(async (tx) => {
              await tx.agent.update({
                where: { id: agentId },
                data: {
                  status: AgentStatus.DISCONNECTED,
                  lastHeartbeat: new Date(),
                },
              });
            });

            this.agents.delete(agentId);
          }
        },
      },
      {
        metrics: {
          tags: {
            operation: 'agent_disconnect',
          },
        },
      }
    );
  }

  async sendCommand(agentId: string, command: string): Promise<void> {
    await this.executeOperation(
      {
        name: 'send_command',
        input: { agentId, command },
        execute: async () => {
          const agent = await this.prisma.$transaction(async (tx) => {
            return tx.agent.findUnique({
              where: { id: agentId },
            });
          });

          if (!agent) {
            throw new ApiError('Agent not found', undefined, 404);
          }

          if (agent.status !== AgentStatus.CONNECTED) {
            throw new ApiError('Agent is not connected', undefined, 400);
          }

          const agentState = this.agents.get(agentId);
          if (!agentState) {
            throw new ApiError('Agent connection not found', undefined, 400);
          }

          await this.protocolHandler.sendCommand(agentState, command);
        },
      },
      {
        retry: {
          maxAttempts: 3,
        },
        metrics: {
          tags: {
            operation: 'send_command',
            agentId,
          },
        },
      }
    );
  }

  private handleCommandResponse(result: AgentCommandResult): void {
    this.logger.debug('Command response received', {
      success: result.success,
      output: result.output,
      error: result.error,
    });
  }

  async getAgentMetrics(): Promise<AgentServiceMetrics> {
    const [metrics, activeAgents] = await Promise.all([
      super.getHealthMetrics(),
      this.prisma.$transaction(async (tx) => {
        return tx.agent.count({
          where: { status: AgentStatus.CONNECTED },
        });
      }),
    ]);

    return {
      operationCount: metrics.operationCount,
      errorCount: metrics.errorCount,
      activeAgents,
      lastError: metrics.lastError,
      uptime: metrics.uptime,
    };
  }

  private async cleanupStaleAgents(): Promise<void> {
    const staleThreshold = new Date(Date.now() - STALE_THRESHOLD);

    try {
      await this.executeOperation(
        {
          name: 'cleanup_stale_agents',
          input: staleThreshold,
          execute: async () => {
            // Cleanup in-memory agents
            for (const [agentId, agent] of this.agents.entries()) {
              if (agent.lastHeartbeat < staleThreshold) {
                if (agent.connectionType === 'ws') {
                  (agent.connection as WebSocket).terminate();
                } else {
                  (agent.connection as Socket).disconnect(true);
                }
                this.agents.delete(agentId);
                
                if (this.cache) {
                  try {
                    await this.cache.del(`agent:${agentId}`);
                  } catch (error) {
                    this.logger.warn('Failed to delete agent from cache', { 
                      agentId, 
                      error: error instanceof Error ? error.message : String(error) 
                    });
                  }
                }
              }
            }

            // Update database status for stale agents
            await this.prisma.$transaction(async (tx) => {
              await tx.agent.updateMany({
                where: {
                  lastHeartbeat: {
                    lt: staleThreshold,
                  },
                  status: AgentStatus.CONNECTED,
                },
                data: {
                  status: AgentStatus.DISCONNECTED,
                },
              });
            });
          },
        },
        {
          metrics: {
            tags: {
              operation: 'cleanup_stale_agents',
            },
          },
        }
      );
    } catch (error) {
      this.logger.error('Failed to cleanup stale agents', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  async cleanup(): Promise<void> {
    await super.cleanup();
    await this.prisma.$disconnect();
  }
}
