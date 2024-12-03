import { PrismaClient, Prisma, Metric } from '@prisma/client';
import { AgentMetrics, AgentMetricsSchema } from '../types/metrics';
import { handleError } from '../utils/error.handler';
import { ERROR_CODES } from '../utils/constants';
import { AgentStatus } from '../../../../types/agent-config';
import { ApiError } from '../../../../types/error';
import { WebSocket } from 'ws';
import type { SocketIOClient } from '../agent.types';
import { AgentMetrics as AgentMetricsType, AgentError } from '../agent.types';
import { logger } from '../../../utils/logger';
import { ERROR_CODES as ERROR_CODES_IMPORT, LOG_METADATA } from '../utils/constants';
import { z } from 'zod';
import { LoggingManager } from '../../../../../../../../../../../utils/logging/LoggingManager';

type MetricsServiceDeps = {
  prisma: PrismaClient;
};

type AgentStatusCounts = Record<AgentStatus, number>;

interface CommandMetrics {
  readonly totalCommands: number;
  readonly avgCommandsPerHost: number;
  readonly activeHosts: number;
}

interface AgentServiceMetrics {
  readonly statusCounts: AgentStatusCounts;
  readonly commandMetrics: CommandMetrics;
}

interface AgentMetricsMetadata extends Prisma.JsonObject {
  lastMetricsUpdate: string;
  metrics: AgentMetricsType;
}

// Type for creating a new metric
type MetricCreateData = Omit<Metric, 'id'>;

// Metrics validation schema
const metricsSchema = z.object({
  cpu: z.object({
    usage: z.number().min(0).max(100),
    cores: z.number().int().positive()
  }),
  memory: z.object({
    total: z.number().positive(),
    used: z.number().positive(),
    free: z.number().positive()
  }),
  disk: z.object({
    total: z.number().positive(),
    used: z.number().positive(),
    free: z.number().positive()
  }),
  network: z.object({
    rx: z.number().nonnegative(),
    tx: z.number().nonnegative()
  }),
  timestamp: z.string().datetime()
}).strict();

type ValidatedMetrics = z.infer<typeof metricsSchema>;

export class MetricsService {
  private readonly prisma: PrismaClient;
  private readonly metricsBuffer: Map<string, ValidatedMetrics[]>;
  private readonly bufferSize: number;

  constructor({ prisma }: MetricsServiceDeps, bufferSize = 100) {
    this.prisma = prisma;
    this.metricsBuffer = new Map();
    this.bufferSize = bufferSize;
  }

  async getMetrics(): Promise<AgentServiceMetrics> {
    const [statusCounts, commandMetrics] = await Promise.all([
      this.getAgentStatusCounts(),
      this.getCommandMetrics()
    ]);

    return {
      statusCounts,
      commandMetrics
    };
  }

  async updateAgentMetrics(hostId: string, metrics: AgentMetricsType): Promise<void> {
    try {
      const validatedMetrics = AgentMetricsSchema.safeParse(metrics);
      if (!validatedMetrics.success) {
        throw new ApiError('Invalid metrics format', {
          code: ERROR_CODES_IMPORT.VALIDATION_ERROR,
          details: validatedMetrics.error.format()
        });
      }

      await this.prisma.$transaction(async (tx) => {
        const host = await tx.host.findUnique({
          where: { id: hostId },
          select: { id: true }
        });

        if (!host) {
          throw new ApiError(`Host not found: ${hostId}`, {
            code: ERROR_CODES_IMPORT.AGENT_NOT_FOUND,
            details: { hostId }
          });
        }

        const metricData: MetricCreateData = {
          hostId: host.id,
          timestamp: new Date(),
          cpu: validatedMetrics.data.cpu.value,
          memory: validatedMetrics.data.memory.value,
          disk: validatedMetrics.data.disk.value,
          networkRx: validatedMetrics.data.network.rx.value,
          networkTx: validatedMetrics.data.network.tx.value
        };

        await tx.metric.create({
          data: metricData
        });

        const metadata: AgentMetricsMetadata = {
          lastMetricsUpdate: new Date().toISOString(),
          metrics: validatedMetrics.data
        };

        await tx.host.update({
          where: { id: hostId },
          data: {
            metadata
          }
        });
      });
    } catch (error) {
      handleError(error, {
        code: ERROR_CODES_IMPORT.INTERNAL_ERROR,
        agentId: hostId,
        context: 'update_metrics'
      });
      throw error;
    }
  }

  async getCommandMetrics(): Promise<CommandMetrics> {
    try {
      const [commandStats, activeHosts] = await Promise.all([
        this.prisma.command.aggregate({
          _count: {
            id: true
          }
        }),
        this.prisma.host.count({
          where: {
            status: 'ONLINE'
          }
        })
      ]);

      const totalCommands = commandStats._count.id;
      const avgCommandsPerHost = activeHosts > 0 ? totalCommands / activeHosts : 0;

      return {
        totalCommands,
        avgCommandsPerHost,
        activeHosts
      };
    } catch (error) {
      handleError(error, {
        code: ERROR_CODES_IMPORT.INTERNAL_ERROR,
        context: 'get_command_metrics'
      });
      throw error;
    }
  }

  async getAgentStatusCounts(): Promise<AgentStatusCounts> {
    try {
      const counts: AgentStatusCounts = {
        ONLINE: 0,
        OFFLINE: 0,
        UNKNOWN: 0,
        ERROR: 0
      };

      const statusCounts = await this.prisma.host.groupBy({
        by: ['agentStatus'],
        _count: {
          id: true
        }
      });

      statusCounts.forEach(({ agentStatus, _count }) => {
        const status = agentStatus as AgentStatus;
        if (status in counts) {
          counts[status] = _count.id;
        }
      });

      return counts;
    } catch (error) {
      handleError(error, {
        code: ERROR_CODES_IMPORT.INTERNAL_ERROR,
        context: 'get_status_counts'
      });
      throw error;
    }
  }

  async getAgentMetricsHistory(
    hostId: string,
    startTime: Date,
    endTime: Date
  ): Promise<AgentMetricsType[]> {
    try {
      const metrics = await this.prisma.metric.findMany({
        where: {
          hostId,
          timestamp: {
            gte: startTime,
            lte: endTime
          }
        },
        orderBy: {
          timestamp: 'asc'
        }
      });

      return metrics.map((metric): AgentMetricsType => ({
        cpu: {
          value: metric.cpu,
          unit: 'percentage' as const,
          timestamp: metric.timestamp.toISOString()
        },
        memory: {
          value: metric.memory,
          unit: 'bytes' as const,
          timestamp: metric.timestamp.toISOString()
        },
        disk: {
          value: metric.disk,
          unit: 'bytes' as const,
          timestamp: metric.timestamp.toISOString()
        },
        network: {
          rx: {
            value: metric.networkRx,
            unit: 'bytesPerSecond' as const,
            timestamp: metric.timestamp.toISOString()
          },
          tx: {
            value: metric.networkTx,
            unit: 'bytesPerSecond' as const,
            timestamp: metric.timestamp.toISOString()
          }
        },
        timestamp: metric.timestamp.toISOString()
      }));
    } catch (error) {
      handleError(error, {
        code: ERROR_CODES_IMPORT.INTERNAL_ERROR,
        agentId: hostId,
        context: 'get_metrics_history'
      });
      throw error;
    }
  }

  public handleMetrics(connection: WebSocket | SocketIOClient, metrics: unknown): void {
    try {
      const validatedMetrics = metricsSchema.parse(metrics);
      const connectionId = this.getConnectionId(connection);
      
      this.storeMetrics(connectionId, validatedMetrics);
      this.emitMetricsUpdate(connection, validatedMetrics);
    } catch (error) {
      this.handleError(connection, error);
    }
  }

  private getConnectionId(connection: WebSocket | SocketIOClient): string {
    return connection instanceof WebSocket 
      ? (connection as WebSocket & { remoteAddress?: string }).remoteAddress || 'unknown'
      : connection.id;
  }

  private storeMetrics(connectionId: string, metrics: ValidatedMetrics): void {
    const buffer = this.metricsBuffer.get(connectionId) || [];
    buffer.push(metrics);
    
    if (buffer.length > this.bufferSize) {
      buffer.shift();
    }
    
    this.metricsBuffer.set(connectionId, buffer);
  }

  private emitMetricsUpdate(connection: WebSocket | SocketIOClient, metrics: ValidatedMetrics): void {
    if (connection instanceof WebSocket) {
      if (connection.readyState === WebSocket.OPEN) {
        connection.send(JSON.stringify({
          type: 'metrics',
          payload: metrics
        }));
      }
    } else {
      connection.emit('metrics:update', {
        hostId: connection.data.hostId,
        metrics
      });
    }
  }

  private handleError(connection: WebSocket | SocketIOClient, error: unknown): void {
    const errorMessage: AgentError = {
      timestamp: new Date(),
      code: ERROR_CODES_IMPORT.METRICS_ERROR,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      details: error instanceof Error ? error.stack : undefined
    };

    loggerLoggingManager.getInstance().();

    if (connection instanceof WebSocket) {
      if (connection.readyState === WebSocket.OPEN) {
        connection.send(JSON.stringify({ type: 'error', payload: errorMessage }));
      }
    } else {
      connection.emit('metrics:error', {
        hostId: connection.data.hostId,
        error: errorMessage.message
      });
    }
  }

  public getMetricsHistory(connectionId: string): ValidatedMetrics[] {
    return this.metricsBuffer.get(connectionId) || [];
  }

  public clearMetrics(connectionId: string): void {
    this.metricsBuffer.delete(connectionId);
  }
}

