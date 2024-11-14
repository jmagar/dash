import { EventEmitter } from 'events';
import Redis from 'ioredis';
import { validateConfig, type CacheConfig } from './config';
import { RedisError, RedisErrorCode, createConnectionError, createAuthenticationError } from './errors';
import { RedisMetricsCollector, type RedisMetrics } from './metrics';
import type { LogMetadata } from '../../types/logger';
import { logger } from '../utils/logger';

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  maxRetries?: number;
  connectTimeout?: number;
  retryStrategy?: (times: number) => number | void;
}

export class RedisManager extends EventEmitter {
  private client: Redis | null = null;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private readonly config: RedisConfig;
  private readonly metricsCollector: RedisMetricsCollector;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 10;

  constructor(config: CacheConfig) {
    super();
    this.config = this.validateConfig(config);
    this.metricsCollector = new RedisMetricsCollector(this.client as Redis);

    // Bind event handlers
    this.handleConnect = this.handleConnect.bind(this);
    this.handleReady = this.handleReady.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleEnd = this.handleEnd.bind(this);
  }

  private validateConfig(config: CacheConfig): RedisConfig {
    if (!config.connection.host || !config.connection.port) {
      throw new RedisError({
        code: RedisErrorCode.INVALID_CONFIG,
        message: 'Invalid Redis configuration: host and port are required',
        metadata: { config },
      });
    }

    return {
      host: config.connection.host,
      port: config.connection.port,
      password: config.connection.password,
      db: config.connection.db,
      maxRetries: config.connection.maxRetries ?? 3,
      connectTimeout: config.connection.connectTimeout ?? 5000,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 1000, 5000);
        return delay;
      },
    };
  }

  public async connect(): Promise<void> {
    if (this.client) {
      return;
    }

    try {
      this.setState(ConnectionState.CONNECTING);
      this.client = new Redis({
        ...this.config,
        lazyConnect: true,
        enableReadyCheck: true,
        autoResubscribe: true,
        maxRetriesPerRequest: 3,
      });

      // Attach event listeners
      this.client.on('connect', this.handleConnect);
      this.client.on('ready', this.handleReady);
      this.client.on('error', this.handleError);
      this.client.on('end', this.handleEnd);

      await this.client.connect();
      this.metricsCollector.start();
    } catch (error) {
      const redisError = error instanceof Error
        ? createConnectionError('Failed to connect to Redis', error)
        : createConnectionError('Failed to connect to Redis');

      this.handleError(redisError);
      throw redisError;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.client) {
      return;
    }

    this.metricsCollector.stop();
    await this.client.quit();
    this.client = null;
    this.setState(ConnectionState.DISCONNECTED);
  }

  public async getClient(): Promise<Redis | null> {
    if (!this.client && this.state === ConnectionState.DISCONNECTED) {
      await this.connect();
    }
    return this.client;
  }

  public getState(): ConnectionState {
    return this.state;
  }

  public getMetrics() {
    return this.metricsCollector.getMetrics();
  }

  private setState(state: ConnectionState): void {
    this.state = state;
    this.emit('state', state);
    this.metricsCollector.updateConnectionState(state);
  }

  private handleConnect(): void {
    logger.info('Redis client connected');
    this.setState(ConnectionState.CONNECTED);
    this.reconnectAttempts = 0;
  }

  private handleReady(): void {
    logger.info('Redis client ready');
    this.setState(ConnectionState.CONNECTED);
  }

  private handleError(error: Error): void {
    const redisError = error instanceof RedisError
      ? error
      : new RedisError({
          code: RedisErrorCode.OPERATION_ERROR,
          message: error.message,
          cause: error,
        });

    logger.error('Redis client error:', { error: redisError });
    this.setState(ConnectionState.ERROR);
    this.emit('error', redisError);

    if (this.shouldAttemptReconnect()) {
      this.handleReconnect();
    }
  }

  private handleEnd(): void {
    logger.info('Redis client connection ended');
    this.setState(ConnectionState.DISCONNECTED);
  }

  private shouldAttemptReconnect(): boolean {
    return (
      this.state !== ConnectionState.DISCONNECTED &&
      this.reconnectAttempts < this.maxReconnectAttempts
    );
  }

  private async handleReconnect(): Promise<void> {
    this.reconnectAttempts++;
    this.setState(ConnectionState.RECONNECTING);

    const delay = Math.min(this.reconnectAttempts * 1000, 5000);
    logger.info(`Attempting to reconnect to Redis (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        logger.error('Redis reconnection failed:', { error });
      }
    }, delay);
  }

  public async shutdown(): Promise<void> {
    this.metricsCollector.stop();
    if (this.client) {
      this.client.removeAllListeners();
      await this.client.quit();
      this.client = null;
    }
    this.setState(ConnectionState.DISCONNECTED);
    this.removeAllListeners();
  }

  public static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      const config = validateConfig();
      RedisManager.instance = new RedisManager(config);
    }
    return RedisManager.instance;
  }

  public async healthCheck(): Promise<{
    status: string;
    connected: boolean;
    metrics: RedisMetrics;
    error?: string;
  }> {
    try {
      await (await this.getClient()).ping();
      return {
        status: 'ok',
        connected: this.getState() === ConnectionState.CONNECTED,
        metrics: this.getMetrics(),
      };
    } catch (error) {
      return {
        status: 'error',
        connected: false,
        metrics: this.getMetrics(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public async get(key: string): Promise<string | null> {
    try {
      return await (await this.getClient()).get(key);
    } catch (error) {
      const metadata: LogMetadata = {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error('Failed to get value:', metadata);
      throw new RedisError(
        RedisErrorCode.OPERATION_FAILED,
        RedisErrorCode.OPERATION_FAILED,
        metadata
      );
    }
  }

  public async set(key: string, value: string, expiry?: number): Promise<void> {
    try {
      const metrics = this.getMetrics();
      
      // Check memory limit
      if (metrics.memory.used >= metrics.memory.limit * 0.9) {
        throw new RedisError(
          RedisErrorCode.MEMORY_LIMIT,
          RedisErrorCode.MEMORY_LIMIT,
          { used: metrics.memory.used, limit: metrics.memory.limit }
        );
      }

      // Check key limit
      if (metrics.keys >= parseInt(process.env.REDIS_MAX_KEYS || '10000', 10)) {
        throw new RedisError(
          RedisErrorCode.KEY_LIMIT,
          RedisErrorCode.KEY_LIMIT,
          { currentKeys: metrics.keys }
        );
      }

      if (expiry) {
        await (await this.getClient()).set(key, value, 'EX', expiry);
      } else {
        await (await this.getClient()).set(key, value);
      }
    } catch (error) {
      const metadata: LogMetadata = {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error('Failed to set value:', metadata);
      
      if (error instanceof RedisError) {
        throw error;
      }
      
      throw new RedisError(
        RedisErrorCode.OPERATION_FAILED,
        RedisErrorCode.OPERATION_FAILED,
        metadata
      );
    }
  }

  public async del(key: string): Promise<void> {
    try {
      await (await this.getClient()).del(key);
    } catch (error) {
      const metadata: LogMetadata = {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error('Failed to delete value:', metadata);
      throw new RedisError(
        RedisErrorCode.OPERATION_FAILED,
        RedisErrorCode.OPERATION_FAILED,
        metadata
      );
    }
  }

  public async exists(key: string): Promise<boolean> {
    try {
      const result = await (await this.getClient()).exists(key);
      return result === 1;
    } catch (error) {
      const metadata: LogMetadata = {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error('Failed to check existence:', metadata);
      throw new RedisError(
        RedisErrorCode.OPERATION_FAILED,
        RedisErrorCode.OPERATION_FAILED,
        metadata
      );
    }
  }
}

enum ConnectionState {
  DISCONNECTED,
  CONNECTING,
  CONNECTED,
  RECONNECTING,
  ERROR,
}
