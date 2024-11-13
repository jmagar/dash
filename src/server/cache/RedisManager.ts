import Redis from 'ioredis';

import { validateConfig, type CacheConfig } from './config';
import { createApiError } from '../../types/error';
import type { LogMetadata } from '../../types/logger';
import { logger } from '../utils/logger';

export class RedisManager {
  private static instance: RedisManager;
  private redis: Redis;
  private isConnected = false;

  private constructor(config: CacheConfig) {
    this.redis = new Redis({
      host: config.connection.host,
      port: config.connection.port,
      password: config.connection.password,
      db: config.connection.db,
      retryStrategy: (times: number): number => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: config.connection.maxRetriesPerRequest,
      enableReadyCheck: true,
      reconnectOnError: (err: Error): boolean => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
    });

    this.redis.on('connect', () => {
      this.isConnected = true;
      logger.info('Redis connected');
    });

    this.redis.on('error', (error) => {
      this.isConnected = false;
      logger.error('Redis error:', { error: error.message });
    });
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
    error?: string;
  }> {
    try {
      await this.redis.ping();
      return {
        status: 'ok',
        connected: this.isConnected,
      };
    } catch (error) {
      return {
        status: 'error',
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.redis.quit();
      this.isConnected = false;
      logger.info('Redis disconnected');
    }
  }

  public async get(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch (error) {
      const metadata: LogMetadata = {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error('Failed to get value:', metadata);
      throw createApiError('Failed to get value', 500, metadata);
    }
  }

  public async set(key: string, value: string, expiry?: number): Promise<void> {
    try {
      if (expiry) {
        await this.redis.set(key, value, 'EX', expiry);
      } else {
        await this.redis.set(key, value);
      }
    } catch (error) {
      const metadata: LogMetadata = {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error('Failed to set value:', metadata);
      throw createApiError('Failed to set value', 500, metadata);
    }
  }

  public async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      const metadata: LogMetadata = {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error('Failed to delete value:', metadata);
      throw createApiError('Failed to delete value', 500, metadata);
    }
  }

  public async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      const metadata: LogMetadata = {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error('Failed to check existence:', metadata);
      throw createApiError('Failed to check existence', 500, metadata);
    }
  }
}
