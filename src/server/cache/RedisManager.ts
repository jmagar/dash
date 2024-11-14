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
  maxRetriesPerRequest?: number;
  retryStrategy?: (times: number) => number | null;
}

export class RedisManager extends EventEmitter {
  private static _instance: RedisManager | null = null;
  private client: Redis | null = null;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private readonly config: RedisConfig;
  private _metricsCollector?: RedisMetricsCollector;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 10;

  private constructor(config: CacheConfig) {
    super();
    this.config = this.validateConfig(config);
  }

  public static getInstance(config?: CacheConfig): RedisManager {
    if (!RedisManager._instance) {
      if (!config) {
        throw new RedisError({
          code: RedisErrorCode.INVALID_CONFIG,
          message: 'Redis configuration is required for initialization',
        });
      }
      RedisManager._instance = new RedisManager(config);
    }
    return RedisManager._instance;
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
      maxRetriesPerRequest: config.connection.maxRetriesPerRequest,
      retryStrategy: (times: number): number | null => {
        if (times > this.maxReconnectAttempts) {
          return null; // Stop retrying
        }
        return Math.min(times * 1000, 30000); // Exponential backoff with max 30s
      },
    };
  }

  public async connect(): Promise<void> {
    if (this.state === ConnectionState.CONNECTED) {
      return;
    }

    this.state = ConnectionState.CONNECTING;
    
    try {
      this.client = new Redis(this.config);
      
      // Set up event listeners
      this.client.on('connect', this.handleConnect.bind(this));
      this.client.on('ready', this.handleReady.bind(this));
      this.client.on('error', this.handleError.bind(this));
      this.client.on('end', this.handleEnd.bind(this));

      // Initialize metrics collector after client is ready
      this.client.once('ready', () => {
        if (this.client) {
          this._metricsCollector = new RedisMetricsCollector(this.client);
        }
      });

    } catch (error) {
      const redisError = createConnectionError(error);
      this.handleError(redisError);
      throw redisError;
    }
  }

  private handleConnect(): void {
    logger.info('Redis client connected');
    this.emit('connect');
  }

  private handleReady(): void {
    this.state = ConnectionState.CONNECTED;
    this.reconnectAttempts = 0;
    logger.info('Redis client ready');
    this.emit('ready');
  }

  private handleError(error: Error): void {
    const metadata: LogMetadata = {
      error: error.message,
      host: this.config.host,
      port: this.config.port,
    };
    logger.error('Redis client error:', metadata);
    this.emit('error', error);
  }

  private handleEnd(): void {
    this.state = ConnectionState.DISCONNECTED;
    logger.info('Redis client connection closed');
    this.emit('end');
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
    this.state = ConnectionState.DISCONNECTED;
  }

  public getClient(): Redis {
    if (!this.client) {
      throw new RedisError({
        code: RedisErrorCode.NOT_CONNECTED,
        message: 'Redis client is not connected',
      });
    }
    return this.client;
  }

  public isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED && this.client !== null;
  }

  public get metricsCollector(): RedisMetricsCollector | undefined {
    return this._metricsCollector;
  }
}

enum ConnectionState {
  DISCONNECTED,
  CONNECTING,
  CONNECTED,
}
