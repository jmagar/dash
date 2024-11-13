import { EventEmitter } from 'events';

import Redis from 'ioredis';

import { cacheConfig } from './config';
import type { RedisClient } from '../../types/cache';
import { createApiError } from '../../types/error';
import type { LogMetadata } from '../../types/logger';
import { logger } from '../utils/logger';

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

export interface RedisMetrics {
  memoryUsage: number;
  keyCount: number;
  lastError?: Error;
  lastErrorTime?: Date;
  uptime: number;
  connectionState: ConnectionState;
  operationsPerSecond: number;
}

export class RedisManager extends EventEmitter implements RedisClient {
  private static instance: RedisManager;
  protected client: Redis | null = null;
  private metrics: RedisMetrics;
  private maxReconnectAttempts = 5;

  protected constructor() {
    super();
    this.metrics = {
      memoryUsage: 0,
      keyCount: 0,
      uptime: 0,
      connectionState: ConnectionState.DISCONNECTED,
      operationsPerSecond: 0,
    };
  }

  public static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  async connect(): Promise<void> {
    try {
      this.client = new Redis({
        ...cacheConfig.connection,
        retryStrategy: (times: number): number | null => {
          const metadata: LogMetadata = {
            attempt: times,
            maxAttempts: this.maxReconnectAttempts,
          };

          if (times > this.maxReconnectAttempts) {
            logger.error('Max reconnection attempts reached', metadata);
            return null;
          }

          logger.info('Attempting reconnection', metadata);
          return Math.min(times * 100, 3000);
        },
      });

      this.setupEventHandlers();
      await this.validateConnection();
      this.startMetricsCollection();
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error('Failed to setup Redis client:', metadata);
      throw createApiError('Failed to setup Redis client', 500, metadata);
    }
  }

  // RedisClient interface implementation
  async get(key: string): Promise<string | null> {
    const client = await this.getClient();
    return client.get(key);
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<'OK' | null> {
    const client = await this.getClient();
    if (mode && duration) {
      return client.set(key, value, mode, duration);
    }
    return client.set(key, value);
  }

  async del(key: string): Promise<number> {
    const client = await this.getClient();
    return client.del(key);
  }

  async lpush(key: string, ...values: string[]): Promise<number> {
    const client = await this.getClient();
    return client.lpush(key, ...values);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const client = await this.getClient();
    return client.lrange(key, start, stop);
  }

  async expire(key: string, seconds: number): Promise<number> {
    const client = await this.getClient();
    return client.expire(key, seconds);
  }

  async ping(): Promise<string> {
    const client = await this.getClient();
    return client.ping();
  }

  async quit(): Promise<'OK' | null> {
    const client = await this.getClient();
    return client.quit();
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down Redis connection');
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('connect', () => {
      this.updateState(ConnectionState.CONNECTED);
      logger.info('Redis connected successfully');
      this.emit('connect');
    });

    this.client.on('error', (error: Error) => {
      const metadata: LogMetadata = {
        error: error.message,
      };
      logger.error('Redis connection error:', metadata);
      this.metrics.lastError = error;
      this.metrics.lastErrorTime = new Date();
      this.updateState(ConnectionState.ERROR);
      this.emit('error', error);
    });

    this.client.on('end', () => {
      this.updateState(ConnectionState.DISCONNECTED);
      logger.info('Redis connection ended');
      this.emit('end');
    });
  }

  private async validateConnection(): Promise<void> {
    if (!this.client) {
      throw createApiError('Redis client not initialized', 500);
    }

    try {
      await this.client.ping();
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      throw createApiError('Failed to validate Redis connection', 500, metadata);
    }
  }

  private startMetricsCollection(): void {
    setInterval(async () => {
      try {
        if (!this.client) return;

        const info = await this.client.info();
        const metrics = this.parseRedisInfo(info);

        // Update metrics
        this.metrics = {
          ...this.metrics,
          ...metrics,
        };

        this.emit('metrics:update', this.metrics);

        // Check limits
        if (this.metrics.memoryUsage && this.metrics.memoryUsage > cacheConfig.limits.maxMemoryMB * 1024 * 1024) {
          logger.warn('Redis memory usage exceeds limit', {
            current: this.metrics.memoryUsage,
            limit: cacheConfig.limits.maxMemoryMB * 1024 * 1024,
          });
        }

        if (this.metrics.keyCount && this.metrics.keyCount > cacheConfig.limits.maxKeys) {
          logger.warn('Redis key count exceeds limit', {
            current: this.metrics.keyCount,
            limit: cacheConfig.limits.maxKeys,
          });
        }
      } catch (error) {
        const metadata: LogMetadata = {
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        logger.error('Failed to update Redis metrics:', metadata);
      }
    }, cacheConfig.monitoring.metricsInterval);
  }

  private parseRedisInfo(info: string): Partial<RedisMetrics> {
    const metrics: Partial<RedisMetrics> = {};
    const lines = info.split('\n');

    for (const line of lines) {
      if (line.startsWith('used_memory:')) {
        metrics.memoryUsage = parseInt(line.split(':')[1], 10);
      }
      if (line.startsWith('db0:')) {
        const keyCount = line.split('=')[1].split(',')[0];
        metrics.keyCount = parseInt(keyCount, 10);
      }
      if (line.startsWith('uptime_in_seconds:')) {
        metrics.uptime = parseInt(line.split(':')[1], 10);
      }
      if (line.startsWith('instantaneous_ops_per_sec:')) {
        metrics.operationsPerSecond = parseInt(line.split(':')[1], 10);
      }
    }

    return metrics;
  }

  private updateState(state: ConnectionState): void {
    this.metrics.connectionState = state;
    this.emit('state:change', state);
  }

  getState(): ConnectionState {
    return this.metrics.connectionState;
  }

  isConnected(): boolean {
    return this.metrics.connectionState === ConnectionState.CONNECTED;
  }

  async getClient(): Promise<Redis> {
    if (!this.client) {
      throw createApiError('Redis client not initialized', 500);
    }
    return this.client;
  }

  getMetrics(): RedisMetrics {
    return { ...this.metrics };
  }
}
