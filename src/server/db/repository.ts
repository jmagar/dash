import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { metrics } from '../metrics';
import { errorAggregator } from '../services/errorAggregator';
import { ApiError } from '../../types/error';
import type { LogMetadata } from '../../types/logger';

export class DatabaseRepository {
  private static instance: DatabaseRepository;
  private prisma: PrismaClient;

  private constructor() {
    this.prisma = new PrismaClient({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'info', emit: 'event' },
        { level: 'warn', emit: 'event' },
      ],
    });

    // Log all database queries in debug mode
    this.prisma.$on('query', (e: any) => {
      logger.debug('Database query', {
        query: e.query,
        params: e.params,
        duration: e.duration,
      });
    });

    // Log all database errors
    this.prisma.$on('error', (e: any) => {
      logger.error('Database error', {
        message: e.message,
        target: e.target,
      });
    });

    // Track metrics for all queries
    this.prisma.$use(async (params, next) => {
      const start = Date.now();
      try {
        const result = await next(params);
        const duration = Date.now() - start;
        metrics.timing('db.query.duration', duration, {
          model: params.model,
          action: params.action,
        });
        metrics.increment('db.query.success', 1, {
          model: params.model,
          action: params.action,
        });
        return result;
      } catch (error) {
        metrics.increment('db.query.error', 1, {
          model: params.model,
          action: params.action,
        });
        throw error;
      }
    });
  }

  public static getInstance(): DatabaseRepository {
    if (!DatabaseRepository.instance) {
      DatabaseRepository.instance = new DatabaseRepository();
    }
    return DatabaseRepository.instance;
  }

  private async withErrorHandling<T>(
    operation: () => Promise<T>,
    context: Record<string, unknown>
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await operation();
      metrics.timing('db.operation.duration', Date.now() - startTime);
      return result;
    } catch (error) {
      metrics.increment('db.operation.error');
      const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
      const metadata: LogMetadata = {
        ...context,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        duration: Date.now() - startTime,
      };

      logger.error('Database operation failed', metadata);
      errorAggregator.trackError(
        error instanceof Error ? error : new Error(errorMessage),
        metadata
      );

      throw new ApiError('Database operation failed', undefined, 500);
    }
  }

  // File System Events
  async createFileSystemEvent(data: {
    path: string;
    eventType: string;
    userId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.withErrorHandling(
      () => this.prisma.fileSystemEvent.create({
        data: {
          path: data.path,
          eventType: data.eventType,
          userId: data.userId,
          metadata: data.metadata as any,
        },
      }),
      { operation: 'createFileSystemEvent', ...data }
    );
  }

  async getFileSystemEvents(options: {
    path?: string;
    userId?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): Promise<any[]> {
    return this.withErrorHandling(
      () => this.prisma.fileSystemEvent.findMany({
        where: {
          path: options.path,
          userId: options.userId,
          timestamp: {
            gte: options.startTime,
            lte: options.endTime,
          },
        },
        take: options.limit,
        orderBy: { timestamp: 'desc' },
      }),
      { operation: 'getFileSystemEvents', ...options }
    );
  }

  // Process Metrics
  async createProcessMetric(data: {
    hostId: string;
    processId: number;
    name: string;
    cpuUsage: number;
    memoryUsage: number;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.withErrorHandling(
      () => this.prisma.processMetric.create({
        data: {
          hostId: data.hostId,
          processId: data.processId,
          name: data.name,
          cpuUsage: data.cpuUsage,
          memoryUsage: data.memoryUsage,
          metadata: data.metadata as any,
        },
      }),
      { operation: 'createProcessMetric', ...data }
    );
  }

  async getProcessMetrics(options: {
    hostId?: string;
    processId?: number;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): Promise<any[]> {
    return this.withErrorHandling(
      () => this.prisma.processMetric.findMany({
        where: {
          hostId: options.hostId,
          processId: options.processId,
          timestamp: {
            gte: options.startTime,
            lte: options.endTime,
          },
        },
        take: options.limit,
        orderBy: { timestamp: 'desc' },
      }),
      { operation: 'getProcessMetrics', ...options }
    );
  }

  // Network Metrics
  async createNetworkMetric(data: {
    hostId: string;
    interface: string;
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
    errorsIn: number;
    errorsOut: number;
  }): Promise<void> {
    await this.withErrorHandling(
      () => this.prisma.networkMetric.create({
        data: {
          hostId: data.hostId,
          interface: data.interface,
          bytesIn: data.bytesIn,
          bytesOut: data.bytesOut,
          packetsIn: data.packetsIn,
          packetsOut: data.packetsOut,
          errorsIn: data.errorsIn,
          errorsOut: data.errorsOut,
        },
      }),
      { operation: 'createNetworkMetric', ...data }
    );
  }

  async getNetworkMetrics(options: {
    hostId?: string;
    interface?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): Promise<any[]> {
    return this.withErrorHandling(
      () => this.prisma.networkMetric.findMany({
        where: {
          hostId: options.hostId,
          interface: options.interface,
          timestamp: {
            gte: options.startTime,
            lte: options.endTime,
          },
        },
        take: options.limit,
        orderBy: { timestamp: 'desc' },
      }),
      { operation: 'getNetworkMetrics', ...options }
    );
  }

  // User Activity
  async createUserActivity(data: {
    userId: string;
    activityType: string;
    resource?: string;
    status?: string;
    duration?: number;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.withErrorHandling(
      () => this.prisma.userActivity.create({
        data: {
          userId: data.userId,
          activityType: data.activityType,
          resource: data.resource,
          status: data.status,
          duration: data.duration,
          metadata: data.metadata as any,
        },
      }),
      { operation: 'createUserActivity', ...data }
    );
  }

  async getUserActivity(options: {
    userId?: string;
    activityType?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): Promise<any[]> {
    return this.withErrorHandling(
      () => this.prisma.userActivity.findMany({
        where: {
          userId: options.userId,
          activityType: options.activityType,
          timestamp: {
            gte: options.startTime,
            lte: options.endTime,
          },
        },
        take: options.limit,
        orderBy: { timestamp: 'desc' },
      }),
      { operation: 'getUserActivity', ...options }
    );
  }

  // Application Metrics
  async createApplicationMetric(data: {
    metricType: string;
    value: number;
    tags?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.withErrorHandling(
      () => this.prisma.applicationMetric.create({
        data: {
          metricType: data.metricType,
          value: data.value,
          tags: data.tags as any,
          metadata: data.metadata as any,
        },
      }),
      { operation: 'createApplicationMetric', ...data }
    );
  }

  async getApplicationMetrics(options: {
    metricType?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): Promise<any[]> {
    return this.withErrorHandling(
      () => this.prisma.applicationMetric.findMany({
        where: {
          metricType: options.metricType,
          timestamp: {
            gte: options.startTime,
            lte: options.endTime,
          },
        },
        take: options.limit,
        orderBy: { timestamp: 'desc' },
      }),
      { operation: 'getApplicationMetrics', ...options }
    );
  }

  // System Events
  async createSystemEvent(data: {
    eventType: string;
    severity: string;
    source: string;
    message?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.withErrorHandling(
      () => this.prisma.systemEvent.create({
        data: {
          eventType: data.eventType,
          severity: data.severity,
          source: data.source,
          message: data.message,
          metadata: data.metadata as any,
        },
      }),
      { operation: 'createSystemEvent', ...data }
    );
  }

  async getSystemEvents(options: {
    eventType?: string;
    severity?: string;
    source?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): Promise<any[]> {
    return this.withErrorHandling(
      () => this.prisma.systemEvent.findMany({
        where: {
          eventType: options.eventType,
          severity: options.severity,
          source: options.source,
          timestamp: {
            gte: options.startTime,
            lte: options.endTime,
          },
        },
        take: options.limit,
        orderBy: { timestamp: 'desc' },
      }),
      { operation: 'getSystemEvents', ...options }
    );
  }

  // Cleanup
  async cleanup(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
