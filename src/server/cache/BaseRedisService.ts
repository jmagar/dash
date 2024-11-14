import Redis from 'ioredis';
import { validateConfig } from './config';
import { RedisError, RedisErrorCode, REDIS_ERROR_MESSAGES } from './errors';
import { RedisMetricsCollector, type RedisMetrics } from './metrics';
import type { LogMetadata } from '../../types/logger';
import { logger } from '../utils/logger';

export abstract class BaseRedisService {
  protected readonly _redis: Redis;
  protected isConnected = false;
  protected readonly metricsCollector: RedisMetricsCollector;

  constructor() {
    const config = validateConfig();
    this._redis = new Redis({
      host: config.connection.host,
      port: config.connection.port,
      password: config.connection.password,
      db: config.connection.db,
      maxRetriesPerRequest: config.connection.maxRetriesPerRequest,
      retryStrategy: (times: number): number | null => {
        if (times > 10) {
          return null; // Stop retrying after 10 attempts
        }
        const delay = Math.min(times * 1000, 30000);
        return delay;
      },
      enableReadyCheck: true,
      reconnectOnError: (err: Error) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          // Only reconnect when the error contains "READONLY"
          return true;
        }
        return false;
      }
    });

    // Initialize metrics collector
    this.metricsCollector = new RedisMetricsCollector(
      this._redis,
      config.metrics.interval
    );
    this.setupEventHandlers();
    this.startMetricsCollection();
  }

  protected setupEventHandlers(): void {
    this._redis.on('connect', () => {
      this.isConnected = true;
      logger.info('Redis connected');
    });

    this._redis.on('error', (error) => {
      this.isConnected = false;
      const metadata: LogMetadata = {
        error: error.message,
      };
      logger.error('Redis error:', metadata);
    });

    this._redis.on('ready', () => {
      logger.info('Redis ready');
    });

    this._redis.on('close', () => {
      this.isConnected = false;
      logger.info('Redis connection closed');
    });
  }

  protected startMetricsCollection(): void {
    void this.metricsCollector.start();
  }

  public get redis(): Redis {
    return this._redis;
  }

  public async healthCheck(): Promise<{
    status: string;
    connected: boolean;
    metrics: RedisMetrics;
    error?: string;
  }> {
    try {
      await this._redis.ping();
      return {
        status: 'ok',
        connected: this.isConnected,
        metrics: this.metricsCollector.getMetrics(),
      };
    } catch (error) {
      return {
        status: 'error',
        connected: false,
        metrics: this.metricsCollector.getMetrics(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this._redis.quit();
      this.isConnected = false;
      logger.info('Redis disconnected');
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error('Failed to disconnect from Redis:', metadata);
      throw new RedisError({
        code: RedisErrorCode.OPERATION_ERROR,
        message: REDIS_ERROR_MESSAGES[RedisErrorCode.OPERATION_ERROR],
        metadata
      });
    }
  }

  public getMetrics(): RedisMetrics {
    return this.metricsCollector.getMetrics();
  }

  protected checkConnection(): void {
    if (!this.isConnected) {
      throw new RedisError({
        code: RedisErrorCode.CONNECTION_ERROR,
        message: REDIS_ERROR_MESSAGES[RedisErrorCode.CONNECTION_ERROR]
      });
    }
  }

  protected handleError(error: unknown, operation: string, metadata: LogMetadata = {}): never {
    const errorMetadata: LogMetadata = {
      ...metadata,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error(`Failed to ${operation}:`, errorMetadata);

    if (error instanceof RedisError) {
      throw error;
    }

    throw new RedisError({
      code: RedisErrorCode.OPERATION_ERROR,
      message: REDIS_ERROR_MESSAGES[RedisErrorCode.OPERATION_ERROR],
      metadata: errorMetadata
    });
  }
}
