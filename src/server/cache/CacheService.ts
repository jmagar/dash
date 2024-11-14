import Redis from 'ioredis';

import { validateConfig } from './config';
import { RedisError, RedisErrorCode, REDIS_ERROR_MESSAGES } from './errors';
import { RedisMetricsCollector, type RedisMetrics } from './metrics';
import type { Cache, CacheCommand } from '../../types/cache';
import { createApiError } from '../../types/error';
import type { LogMetadata } from '../../types/logger';
import type { Container, Stack } from '../../types/models-shared';
import { logger } from '../utils/logger';
import type { ICacheService } from './types';

export class CacheService implements ICacheService {
  private readonly CACHE_KEYS = {
    SESSION: 'session',
    HOST: 'host',
    DOCKER: {
      CONTAINERS: 'docker:containers',
      STACKS: 'docker:stacks',
    },
    COMMAND: 'command',
  };

  private readonly CACHE_TTL = {
    SESSION: 3600, // 1 hour
    HOST: 300, // 5 minutes
    DOCKER: {
      CONTAINERS: 300, // 5 minutes
      STACKS: 300, // 5 minutes
    },
    COMMAND: 86400, // 24 hours
  };

  private _redis: Redis;
  private isConnected = false;
  private metricsCollector: RedisMetricsCollector;

  constructor() {
    const config = validateConfig();
    this._redis = new Redis({
      host: config.connection.host,
      port: config.connection.port,
      password: config.connection.password,
      db: config.connection.db,
      retryStrategy: (times: number): number | null => {
        if (times > 10) {
          return null; // Stop retrying after 10 attempts
        }
        const delay = Math.min(times * 1000, 30000);
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
      showFriendlyErrorStack: process.env.NODE_ENV !== 'production',
    });

    this.metricsCollector = new RedisMetricsCollector(this._redis, config.metrics.interval);
    this.setupEventHandlers();
    this.startMetricsCollection();
  }

  private setupEventHandlers(): void {
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

  private startMetricsCollection(): void {
    this.metricsCollector.start();
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
      this.metricsCollector.stop();
      await this._redis.quit();
      this.isConnected = false;
      logger.info('Redis disconnected');
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error('Failed to disconnect from Redis:', metadata);
      throw new RedisError(
        REDIS_ERROR_MESSAGES[RedisErrorCode.OPERATION_FAILED],
        RedisErrorCode.OPERATION_FAILED,
        metadata
      );
    }
  }

  public async cacheSession(token: string, data: string): Promise<void> {
    try {
      if (!this.isConnected) {
        throw new RedisError(
          REDIS_ERROR_MESSAGES[RedisErrorCode.CONNECTION_FAILED],
          RedisErrorCode.CONNECTION_FAILED
        );
      }

      await this._redis.set(
        `${this.CACHE_KEYS.SESSION}:${token}`,
        data,
        'EX',
        this.CACHE_TTL.SESSION
      );
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error('Failed to cache session:', metadata);
      
      if (error instanceof RedisError) {
        throw error;
      }
      
      throw new RedisError(
        REDIS_ERROR_MESSAGES[RedisErrorCode.OPERATION_FAILED],
        RedisErrorCode.OPERATION_FAILED,
        metadata
      );
    }
  }

  public async getSession(token: string): Promise<string | null> {
    try {
      if (!this.isConnected) {
        throw new RedisError(
          REDIS_ERROR_MESSAGES[RedisErrorCode.CONNECTION_FAILED],
          RedisErrorCode.CONNECTION_FAILED
        );
      }

      return await this._redis.get(`${this.CACHE_KEYS.SESSION}:${token}`);
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error('Failed to get session:', metadata);
      
      if (error instanceof RedisError) {
        throw error;
      }
      
      throw new RedisError(
        REDIS_ERROR_MESSAGES[RedisErrorCode.OPERATION_FAILED],
        RedisErrorCode.OPERATION_FAILED,
        metadata
      );
    }
  }

  public async deleteSession(token: string): Promise<void> {
    try {
      if (!this.isConnected) {
        throw new RedisError(
          REDIS_ERROR_MESSAGES[RedisErrorCode.CONNECTION_FAILED],
          RedisErrorCode.CONNECTION_FAILED
        );
      }

      await this._redis.del(`${this.CACHE_KEYS.SESSION}:${token}`);
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error('Failed to delete session:', metadata);
      
      if (error instanceof RedisError) {
        throw error;
      }
      
      throw new RedisError(
        REDIS_ERROR_MESSAGES[RedisErrorCode.OPERATION_FAILED],
        RedisErrorCode.OPERATION_FAILED,
        metadata
      );
    }
  }

  public async cacheHostStatus(hostId: string, status: Cache.HostStatus): Promise<void> {
    try {
      await this._redis.set(
        `${this.CACHE_KEYS.HOST}:${hostId}:status`,
        JSON.stringify(status),
        'EX',
        this.CACHE_TTL.HOST
      );
    } catch (error) {
      const metadata: LogMetadata = {
        hostId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error('Failed to cache host status:', metadata);
      throw new RedisError(
        REDIS_ERROR_MESSAGES[RedisErrorCode.OPERATION_FAILED],
        RedisErrorCode.OPERATION_FAILED,
        metadata
      );
    }
  }

  public async getHostStatus(hostId: string): Promise<Cache.HostStatus | null> {
    try {
      const data = await this._redis.get(`${this.CACHE_KEYS.HOST}:${hostId}:status`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      const metadata: LogMetadata = {
        hostId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error('Failed to get host status:', metadata);
      throw new RedisError(
        REDIS_ERROR_MESSAGES[RedisErrorCode.OPERATION_FAILED],
        RedisErrorCode.OPERATION_FAILED,
        metadata
      );
    }
  }

  public async invalidateHostCache(hostId: string): Promise<void> {
    try {
      await this._redis.del(`${this.CACHE_KEYS.HOST}:${hostId}:status`);
    } catch (error) {
      const metadata: LogMetadata = {
        hostId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error('Failed to invalidate host cache:', metadata);
      throw new RedisError(
        REDIS_ERROR_MESSAGES[RedisErrorCode.OPERATION_FAILED],
        RedisErrorCode.OPERATION_FAILED,
        metadata
      );
    }
  }

  public async cacheDockerContainers(hostId: string, containers: Container[]): Promise<void> {
    try {
      await this._redis.set(
        `${this.CACHE_KEYS.DOCKER.CONTAINERS}:${hostId}`,
        JSON.stringify(containers),
        'EX',
        this.CACHE_TTL.DOCKER.CONTAINERS
      );
    } catch (error) {
      const metadata: LogMetadata = {
        hostId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error('Failed to cache Docker containers:', metadata);
      throw new RedisError(
        REDIS_ERROR_MESSAGES[RedisErrorCode.OPERATION_FAILED],
        RedisErrorCode.OPERATION_FAILED,
        metadata
      );
    }
  }

  public async getDockerContainers(hostId: string): Promise<Container[]> {
    try {
      const data = await this._redis.get(`${this.CACHE_KEYS.DOCKER.CONTAINERS}:${hostId}`);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      const metadata: LogMetadata = {
        hostId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error('Failed to get Docker containers:', metadata);
      throw new RedisError(
        REDIS_ERROR_MESSAGES[RedisErrorCode.OPERATION_FAILED],
        RedisErrorCode.OPERATION_FAILED,
        metadata
      );
    }
  }

  public async cacheDockerStacks(hostId: string, stacks: Stack[]): Promise<void> {
    try {
      await this._redis.set(
        `${this.CACHE_KEYS.DOCKER.STACKS}:${hostId}`,
        JSON.stringify(stacks),
        'EX',
        this.CACHE_TTL.DOCKER.STACKS
      );
    } catch (error) {
      const metadata: LogMetadata = {
        hostId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error('Failed to cache Docker stacks:', metadata);
      throw new RedisError(
        REDIS_ERROR_MESSAGES[RedisErrorCode.OPERATION_FAILED],
        RedisErrorCode.OPERATION_FAILED,
        metadata
      );
    }
  }

  public async getDockerStacks(hostId: string): Promise<Stack[]> {
    try {
      const data = await this._redis.get(`${this.CACHE_KEYS.DOCKER.STACKS}:${hostId}`);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      const metadata: LogMetadata = {
        hostId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error('Failed to get Docker stacks:', metadata);
      throw new RedisError(
        REDIS_ERROR_MESSAGES[RedisErrorCode.OPERATION_FAILED],
        RedisErrorCode.OPERATION_FAILED,
        metadata
      );
    }
  }

  public async cacheCommand(userId: string, hostId: string, command: CacheCommand | CacheCommand[]): Promise<void> {
    try {
      const key = `${this.CACHE_KEYS.COMMAND}:${userId}:${hostId}`;
      const commands = Array.isArray(command) ? command : [command];
      await this._redis.lpush(key, ...commands.map(cmd => JSON.stringify(cmd)));
      await this._redis.expire(key, this.CACHE_TTL.COMMAND);
      await this._redis.ltrim(key, 0, 99); // Keep last 100 commands
    } catch (error) {
      const metadata: LogMetadata = {
        userId,
        hostId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error('Failed to cache command:', metadata);
      throw new RedisError(
        REDIS_ERROR_MESSAGES[RedisErrorCode.OPERATION_FAILED],
        RedisErrorCode.OPERATION_FAILED,
        metadata
      );
    }
  }

  public async getCommands(userId: string, hostId: string): Promise<CacheCommand[]> {
    try {
      const key = `${this.CACHE_KEYS.COMMAND}:${userId}:${hostId}`;
      const commands = await this._redis.lrange(key, 0, -1);
      return commands.map(cmd => {
        try {
          return JSON.parse(cmd);
        } catch {
          throw new RedisError(
            REDIS_ERROR_MESSAGES[RedisErrorCode.INVALID_DATA],
            RedisErrorCode.INVALID_DATA,
            { command: cmd }
          );
        }
      });
    } catch (error) {
      const metadata: LogMetadata = {
        userId,
        hostId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error('Failed to get commands:', metadata);
      
      if (error instanceof RedisError) {
        throw error;
      }
      
      throw new RedisError(
        REDIS_ERROR_MESSAGES[RedisErrorCode.OPERATION_FAILED],
        RedisErrorCode.OPERATION_FAILED,
        metadata
      );
    }
  }

  public getMetrics(): RedisMetrics {
    return this.metricsCollector.getMetrics();
  }
}

// Export singleton instance
export const cacheService = new CacheService();
