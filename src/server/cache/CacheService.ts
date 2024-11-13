import Redis from 'ioredis';

import { validateConfig } from './config';
import type { CacheCommand } from '../../types/cache';
import { createApiError } from '../../types/error';
import type { LogMetadata } from '../../types/logger';
import type { Container, Stack } from '../../types/models-shared';
import { logger } from '../utils/logger';

export class CacheService {
  private redis: Redis;
  private isConnected = false;

  constructor() {
    const config = validateConfig();
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

  public async cacheSession(token: string, data: string): Promise<void> {
    try {
      await this.redis.set(`session:${token}`, data, 'EX', 3600); // 1 hour expiry
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error('Failed to cache session:', metadata);
      throw createApiError('Failed to cache session', 500, metadata);
    }
  }

  public async getSession(token: string): Promise<string | null> {
    try {
      return await this.redis.get(`session:${token}`);
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error('Failed to get session:', metadata);
      throw createApiError('Failed to get session', 500, metadata);
    }
  }

  public async invalidateSession(token: string): Promise<void> {
    try {
      await this.redis.del(`session:${token}`);
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error('Failed to invalidate session:', metadata);
      throw createApiError('Failed to invalidate session', 500, metadata);
    }
  }

  public async cacheHostStatus(hostId: string, status: unknown): Promise<void> {
    try {
      await this.redis.set(`host:${hostId}`, JSON.stringify(status), 'EX', 300); // 5 minutes expiry
    } catch (error) {
      const metadata: LogMetadata = {
        hostId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error('Failed to cache host status:', metadata);
      throw createApiError('Failed to cache host status', 500, metadata);
    }
  }

  public async getHostStatus(hostId: string): Promise<unknown | null> {
    try {
      const data = await this.redis.get(`host:${hostId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      const metadata: LogMetadata = {
        hostId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error('Failed to get host status:', metadata);
      throw createApiError('Failed to get host status', 500, metadata);
    }
  }

  public async invalidateHostCache(hostId: string): Promise<void> {
    try {
      await this.redis.del(`host:${hostId}`);
    } catch (error) {
      const metadata: LogMetadata = {
        hostId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error('Failed to invalidate host cache:', metadata);
      throw createApiError('Failed to invalidate host cache', 500, metadata);
    }
  }

  public async getDockerContainers(hostId: string): Promise<Container[]> {
    try {
      const data = await this.redis.get(`docker:containers:${hostId}`);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      const metadata: LogMetadata = {
        hostId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error('Failed to get Docker containers:', metadata);
      throw createApiError('Failed to get Docker containers', 500, metadata);
    }
  }

  public async cacheDockerContainers(hostId: string, containers: Container[]): Promise<void> {
    try {
      await this.redis.set(`docker:containers:${hostId}`, JSON.stringify(containers), 'EX', 300); // 5 minutes expiry
    } catch (error) {
      const metadata: LogMetadata = {
        hostId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error('Failed to cache Docker containers:', metadata);
      throw createApiError('Failed to cache Docker containers', 500, metadata);
    }
  }

  public async getDockerStacks(hostId: string): Promise<Stack[]> {
    try {
      const data = await this.redis.get(`docker:stacks:${hostId}`);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      const metadata: LogMetadata = {
        hostId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error('Failed to get Docker stacks:', metadata);
      throw createApiError('Failed to get Docker stacks', 500, metadata);
    }
  }

  public async cacheDockerStacks(hostId: string, stacks: Stack[]): Promise<void> {
    try {
      await this.redis.set(`docker:stacks:${hostId}`, JSON.stringify(stacks), 'EX', 300); // 5 minutes expiry
    } catch (error) {
      const metadata: LogMetadata = {
        hostId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error('Failed to cache Docker stacks:', metadata);
      throw createApiError('Failed to cache Docker stacks', 500, metadata);
    }
  }

  public async cacheCommand(userId: string, hostId: string, command: CacheCommand | CacheCommand[]): Promise<void> {
    try {
      const key = `command:${userId}:${hostId}`;
      const commands = Array.isArray(command) ? command : [command];
      await this.redis.lpush(key, ...commands.map(cmd => JSON.stringify(cmd)));
      await this.redis.ltrim(key, 0, 99); // Keep last 100 commands
    } catch (error) {
      const metadata: LogMetadata = {
        userId,
        hostId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error('Failed to cache command:', metadata);
      throw createApiError('Failed to cache command', 500, metadata);
    }
  }

  public async getCommands(userId: string, hostId: string): Promise<CacheCommand[]> {
    try {
      const key = `command:${userId}:${hostId}`;
      const commands = await this.redis.lrange(key, 0, -1);
      return commands.map(cmd => JSON.parse(cmd));
    } catch (error) {
      const metadata: LogMetadata = {
        userId,
        hostId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error('Failed to get commands:', metadata);
      throw createApiError('Failed to get commands', 500, metadata);
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();
