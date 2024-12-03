import { Pool, PoolConfig, QueryResult } from 'pg';
import { PrismaClient } from '@prisma/client';
import { logger } from '../logger';
import { MetricsManager } from '../metrics/MetricsManager';
import { LoggingManager } from '../../../../../../../../../../utils/logging/LoggingManager';

export interface QueryOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export class DatabaseManager {
  private static instance: DatabaseManager;
  private pool: Pool;
  private prisma: PrismaClient;
  private metrics: MetricsManager;

  private constructor(config: PoolConfig) {
    this.pool = new Pool(config);
    this.prisma = new PrismaClient();
    this.metrics = MetricsManager.getInstance();
    this.setupEventHandlers();
    this.setupMetrics();
  }

  public static getInstance(config?: PoolConfig): DatabaseManager {
    if (!DatabaseManager.instance) {
      if (!config) {
        throw new Error('Database configuration required for initialization');
      }
      DatabaseManager.instance = new DatabaseManager(config);
    }
    return DatabaseManager.instance;
  }

  private setupEventHandlers(): void {
    // Pool error handler
    this.pool.on('error', (error: Error) => {
      loggerLoggingManager.getInstance().();
      this.metrics.increment('db_errors_total', { type: 'pool_error' });
    });

    // Pool connection handler
    this.pool.on('connect', () => {
      loggerLoggingManager.getInstance().();
      this.metrics.set('db_connections', {}, this.pool.totalCount);
    });

    // Prisma logging
    this.prisma.$use(async (params, next) => {
      const start = Date.now();
      try {
        const result = await next(params);
        const duration = Date.now() - start;
        
        this.metrics.observe('db_query_duration_seconds', {
          model: params.model,
          action: params.action
        }, duration / 1000);
        
        return result;
      } catch (error) {
        this.metrics.increment('db_errors_total', {
          type: 'prisma_error',
          model: params.model,
          action: params.action
        });
        throw error;
      }
    });
  }

  private setupMetrics(): void {
    // Database metrics
    this.metrics.gauge({
      name: 'db_connections',
      help: 'Number of active database connections'
    });

    this.metrics.counter({
      name: 'db_errors_total',
      help: 'Total number of database errors',
      labelNames: ['type', 'model', 'action']
    });

    this.metrics.histogram({
      name: 'db_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['model', 'action'],
      buckets: [0.1, 0.5, 1, 2, 5]
    });
  }

  /**
   * Execute a query with retries and metrics
   */
  public async query<T>(
    text: string,
    params: any[] = [],
    options: QueryOptions = {}
  ): Promise<QueryResult<T>> {
    const {
      timeout = 5000,
      retries = 3,
      retryDelay = 1000
    } = options;

    let attempts = 0;
    const start = Date.now();

    while (attempts < retries) {
      try {
        const queryPromise = this.pool.query<T>(text, params);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout')), timeout)
        );

        const result = await Promise.race([queryPromise, timeoutPromise]) as QueryResult<T>;

        const duration = Date.now() - start;
        this.metrics.observe('db_query_duration_seconds', {
          type: 'raw_query'
        }, duration / 1000);

        return result;
      } catch (error) {
        attempts++;
        const isLastAttempt = attempts === retries;

        loggerLoggingManager.getInstance().()`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          query: text,
          params
        });

        this.metrics.increment('db_errors_total', {
          type: 'query_error'
        });

        if (isLastAttempt) {
          throw error;
        }

        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    throw new Error('Query failed after max retries');
  }

  /**
   * Get Prisma client instance
   */
  public getPrismaClient(): PrismaClient {
    return this.prisma;
  }

  /**
   * Execute in transaction
   */
  public async transaction<T>(
    callback: (client: any) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      loggerLoggingManager.getInstance().();
      return false;
    }
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    await this.pool.end();
    await this.prisma.$disconnect();
  }
}

