import Redis from 'ioredis';
import { LoggingManager } from '../utils/logging/LoggingManager';
import type { LogMetadata } from '../../types/logger';
import {
  RedisConfig,
  RedisResult,
  RedisState,
  RedisError,
  RedisErrorCode,
  RedisMetrics,
  RedisMemoryMetrics,
  RedisConnectionMetrics,
  RedisOperationsMetrics,
  RedisEvents
} from '../../types/redis';
import { RedisMetricsCollector } from './RedisMetricsCollector';
import { validateKey, serialize, deserialize } from './utils/validation';
import { getErrorMessage, getErrorCode, wrapError } from './utils/error';
import { errorAggregator } from '../services/errorAggregator';
import { metrics } from '../services/metrics';

/**
 * Base Redis service providing common functionality for cache services
 */
export abstract class BaseRedisService {
  protected readonly _redis: Redis;
  private _state: RedisState = RedisState.DISCONNECTED;
  private _metrics: RedisMetrics;
  private _config: RedisConfig;
  protected readonly metricsCollector: RedisMetricsCollector;
  private memoryCheckInterval?: NodeJS.Timeout;

  constructor(config: RedisConfig) {
    this._config = this.validateConfig(config);
    this._redis = new Redis({
      host: config.connection.host,
      port: config.connection.port,
      password: config.connection.password,
      db: config.connection.db,
      maxRetriesPerRequest: config.retry.maxAttempts,
      retryStrategy: (times: number) => {
        if (times > config.retry.maxAttempts) {
          return null;
        }
        const delay = Math.min(
          config.retry.initialDelay * Math.pow(config.retry.factor, times - 1),
          config.retry.maxDelay
        );
        return delay;
      }
    });

    this._metrics = {
      memory: {
        usedMemory: 0,
        peakMemory: 0,
        fragmentationRatio: 0,
        evictedKeys: 0,
        blockedClients: 0,
      },
      connection: {
        connectedClients: 0,
        blockedClients: 0,
        rejectionsPerSecond: 0,
        totalConnections: 0,
      },
      operations: {
        totalCommands: 0,
        opsPerSecond: 0,
        keyspaceHits: 0,
        keyspaceMisses: 0,
        hitRate: 0,
      },
      timestamp: new Date(),
    };

    this.metricsCollector = new RedisMetricsCollector(this._redis, config.metrics);
    this._state = RedisState.DISCONNECTED;
    this.setupEventHandlers();
    this.setupMemoryMonitoring();

    this._redis.on('error', (error) => {
      const metadata: LogMetadata = {
        error: getErrorMessage(error),
        service: this.constructor.name,
      };
      LoggingManager.getInstance().error('Redis connection error', metadata);
      errorAggregator.trackError(error, metadata);
    });
  }

  /**
   * Sets up Redis event handlers for connection management
   */
  private setupEventHandlers(): void {
    this._redis.on('connect', () => {
      this._state = RedisState.CONNECTED;
      LoggingManager.getInstance().info('Redis connection established', {
        event: 'connect',
        state: this._state
      } satisfies LogMetadata);
    });

    this._redis.on('ready', () => {
      this._state = RedisState.READY;
      LoggingManager.getInstance().info('Redis client ready', {
        event: 'ready',
        state: this._state
      } satisfies LogMetadata);
      this.metricsCollector.start();
      this.configureRedisInstance();
    });

    this._redis.on('close', () => {
      this._state = RedisState.DISCONNECTED;
      LoggingManager.getInstance().warn('Redis connection closed', {
        event: 'close',
        state: this._state
      } satisfies LogMetadata);
      this.metricsCollector.stop();
      this.stopMemoryMonitoring();
    });

    this._redis.on('reconnecting', (retries: number) => {
      this._state = RedisState.RECONNECTING;
      LoggingManager.getInstance().info('Redis client reconnecting', {
        event: 'reconnecting',
        retries,
        state: this._state
      } satisfies LogMetadata);
    });

    this.metricsCollector.on('metrics:update', (metrics: RedisMetrics) => {
      this._metrics = metrics;
      this.checkMemoryUsage();
      LoggingManager.getInstance().debug('Redis metrics updated', {
        event: 'metrics:update',
        metrics
      } satisfies LogMetadata);
    });
  }

  /**
   * Configures Redis instance with memory and performance settings
   */
  private async configureRedisInstance(): Promise<void> {
    try {
      // Set memory limit if configured
      if (this._config.memory.limit) {
        await this._redis.config('SET', 'maxmemory', this._config.memory.limit);
        await this._redis.config('SET', 'maxmemory-policy', this._config.memory.evictionPolicy || 'volatile-lru');
      }

      // Configure client output buffer limits
      await this._redis.config('SET', 'client-output-buffer-limit', 'normal 0 0 0');

      // Enable keyspace notifications for eviction monitoring
      await this._redis.config('SET', 'notify-keyspace-events', 'Exe');

      LoggingManager.getInstance().info('Redis instance configured', {
        event: 'configure',
        config: {
          maxmemory: this._config.memory.limit,
          evictionPolicy: this._config.memory.evictionPolicy,
        },
      } satisfies LogMetadata);
    } catch (error) {
      LoggingManager.getInstance().error('Failed to configure Redis instance', {
        event: 'configure',
        error: error instanceof Error ? error.message : String(error),
      } satisfies LogMetadata);
    }
  }

  /**
   * Sets up memory monitoring
   */
  private setupMemoryMonitoring(): void {
    if (this._config.memory.warningThreshold) {
      this.memoryCheckInterval = setInterval(
        () => this.checkMemoryUsage(),
        60000 // Check every minute
      );
    }
  }

  /**
   * Stops memory monitoring
   */
  private stopMemoryMonitoring(): void {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = undefined;
    }
  }

  /**
   * Checks memory usage and emits warnings if threshold exceeded
   */
  private async checkMemoryUsage(): Promise<void> {
    if (!this._config.memory.warningThreshold) return;

    const memoryInfo = await this._redisLoggingManager.getInstance().();
    const usedMemory = parseInt(memoryInfo.match(/used_memory:(\d+)/)?.[1] || '0', 10);
    const maxMemory = parseInt(memoryInfo.match(/maxmemory:(\d+)/)?.[1] || '0', 10);

    if (maxMemory > 0) {
      const usageRatio = usedMemory / maxMemory;
      if (usageRatio >= this._config.memory.warningThreshold) {
        LoggingManager.getInstance().warn('Redis memory usage exceeds warning threshold', {
          event: 'memory:warning',
          usage: usageRatio,
          usedMemory,
          maxMemory,
          threshold: this._config.memory.warningThreshold,
        } satisfies LogMetadata);

        // Emit memory warning event
        (this._redis as unknown as EventEmitter).emit('memory:warning', usageRatio);
      }
    }
  }

  /**
   * Validates the provided configuration
   */
  private validateConfig(config: RedisConfig): RedisConfig {
    if (!config.connection?.host || !config.connection?.port) {
      throw new RedisError({
        code: RedisErrorCode.INVALID_CONFIG,
        message: 'Redis host and port are required',
        metadata: { config: config.connection },
      });
    }

    if (config.memory?.limit) {
      const memoryLimit = parseInt(config.memory.limit);
      if (isNaN(memoryLimit) || memoryLimit <= 0) {
        throw new RedisError({
          code: RedisErrorCode.INVALID_CONFIG,
          message: 'Invalid memory limit configuration',
          metadata: { limit: config.memory.limit },
        });
      }
    }

    if (config.memory?.warningThreshold !== undefined &&
        (config.memory.warningThreshold <= 0 || config.memory.warningThreshold >= 1)) {
      throw new RedisError({
        code: RedisErrorCode.INVALID_CONFIG,
        message: 'Warning threshold must be between 0 and 1',
        metadata: { threshold: config.memory.warningThreshold },
      });
    }

    return config;
  }

  /**
   * Gets the current Redis state
   */
  public getState(): RedisState {
    return this._state;
  }

  /**
   * Gets the current metrics
   */
  public getMetrics(): RedisMetrics {
    return this._metrics;
  }

  /**
   * Safely executes a Redis operation with error handling and metrics
   */
  protected async executeOperation<T>(
    operation: string,
    callback: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<RedisResult<T>> {
    const startTime = Date.now();
    let retries = 0;

    try {
      if (this._state !== RedisState.READY) {
        throw new RedisError({
          code: RedisErrorCode.NOT_CONNECTED,
          message: 'Redis client is not ready',
          metadata: { state: this._state },
        });
      }

      const result = await callback();

      metrics.timing('redis.operation', Date.now() - startTime, {
        ...metadata,
        operation,
        success: true,
      });

      return {
        success: true,
        data: result,
        metadata: {
          duration: Date.now() - startTime,
          retries,
          ...metadata,
        },
      };
    } catch (error) {
      metrics.timing('redis.operation', Date.now() - startTime, {
        ...metadata,
        operation,
        success: false,
      });

      LoggingManager.getInstance().error('Redis operation failed', {
        operation,
        error: this.getErrorMessage(error),
        duration: Date.now() - startTime,
        retries,
        ...metadata,
      } satisfies LogMetadata);

      throw wrapError(error, `Redis operation failed: ${operation}`, {
        service: this.constructor.name,
        operation,
        ...metadata,
      });
    }
  }

  private getErrorMessage(error: unknown): string {
    return getErrorMessage(error);
  }

  private getErrorCode(error: unknown): RedisErrorCode {
    return getErrorCode(error);
  }

  private wrapError(error: unknown, message: string, metadata?: Record<string, unknown>): RedisError {
    return wrapError(error, message, metadata);
  }

  /**
   * Validates a key before using it in Redis operations
   */
  protected validateKey(key: string): void {
    if (!key) {
      throw wrapError(
        new Error('Invalid key'),
        'Redis key cannot be empty',
        {
          service: this.constructor.name,
        }
      );
    }
    validateKey(key);
  }

  /**
   * Serializes data for Redis storage
   */
  protected serialize<T>(data: T): string {
    return serialize(data);
  }

  /**
   * Deserializes data from Redis storage
   */
  protected deserialize<T>(data: string): T {
    return deserialize<T>(data);
  }

  /**
   * Cleans up resources
   */
  public async shutdown(): Promise<void> {
    this.stopMemoryMonitoring();
    await this.metricsCollector.stop();
    await this._redis.quit();
  }
}


