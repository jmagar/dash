import { KEY_PREFIXES, TTL_CONFIG } from './config';
import { RedisManager } from './RedisManager';
import type { CacheCommand, CacheKeys, CacheTTL, Cache, RedisClient } from '../../types/cache';
import { createApiError } from '../../types/error';
import type { LogMetadata } from '../../types/logger';
import { logger } from '../utils/logger';

/**
 * Implementation of the Cache interface with enhanced features:
 * - Type-safe caching operations
 * - Automatic error handling and logging
 * - Integration with monitoring
 */
export class CacheService implements Cache {
  private redisManager: RedisManager;
  readonly CACHE_KEYS: CacheKeys;
  readonly CACHE_TTL: CacheTTL;

  constructor() {
    this.redisManager = RedisManager.getInstance();
    this.CACHE_KEYS = KEY_PREFIXES;
    this.CACHE_TTL = TTL_CONFIG;

    // Set up error handling
    this.redisManager.on('error', (error) => {
      const metadata: LogMetadata = {
        error: error.message,
        code: error.code,
      };
      logger.error('Redis error in CacheService:', metadata);
    });

    // Monitor cache metrics
    this.redisManager.on('metrics:update', (metrics) => {
      logger.debug('Cache metrics updated:', metrics);
    });
  }

  /**
   * Get Redis client implementation
   */
  get redis(): RedisClient {
    return this.redisManager;
  }

  async cacheSession(token: string, sessionData: string): Promise<void> {
    const client = await this.redisManager.getClient();
    if (!client) return;

    try {
      await client.set(
        `${this.CACHE_KEYS.SESSION}:${token}`,
        sessionData,
        'EX',
        this.CACHE_TTL.SESSION,
      );
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
        token,
      };
      logger.error('Failed to cache session:', metadata);
      throw createApiError('Failed to cache session', 500, metadata);
    }
  }

  async getSession(token: string): Promise<string | null> {
    const client = await this.redisManager.getClient();
    if (!client) return null;

    try {
      return await client.get(`${this.CACHE_KEYS.SESSION}:${token}`);
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
        token,
      };
      logger.error('Failed to get session:', metadata);
      throw createApiError('Failed to get session', 500, metadata);
    }
  }

  async invalidateSession(token: string): Promise<void> {
    const client = await this.redisManager.getClient();
    if (!client) return;

    try {
      await client.del(`${this.CACHE_KEYS.SESSION}:${token}`);
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
        token,
      };
      logger.error('Failed to invalidate session:', metadata);
      throw createApiError('Failed to invalidate session', 500, metadata);
    }
  }

  async healthCheck(): Promise<{ status: string; connected: boolean; error?: string }> {
    try {
      const client = await this.redisManager.getClient();
      if (!client) {
        return {
          status: 'error',
          connected: false,
          error: 'Redis client not available',
        };
      }

      await client.ping();
      return {
        status: 'ok',
        connected: true,
      };
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error('Health check failed:', metadata);
      return {
        status: 'error',
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  isConnected(): boolean {
    return this.redisManager.isConnected();
  }

  async getHostStatus(id: string): Promise<unknown> {
    const client = await this.redisManager.getClient();
    if (!client) return null;

    try {
      const data = await client.get(`${this.CACHE_KEYS.HOST}:${id}:status`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId: id,
      };
      logger.error('Failed to get host status:', metadata);
      throw createApiError('Failed to get host status', 500, metadata);
    }
  }

  async cacheHostStatus(id: string, data: unknown): Promise<void> {
    const client = await this.redisManager.getClient();
    if (!client) return;

    try {
      await client.set(
        `${this.CACHE_KEYS.HOST}:${id}:status`,
        JSON.stringify(data),
        'EX',
        this.CACHE_TTL.HOST,
      );
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId: id,
      };
      logger.error('Failed to cache host status:', metadata);
      throw createApiError('Failed to cache host status', 500, metadata);
    }
  }

  async invalidateHostCache(id: string): Promise<void> {
    const client = await this.redisManager.getClient();
    if (!client) return;

    try {
      await client.del(`${this.CACHE_KEYS.HOST}:${id}:status`);
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId: id,
      };
      logger.error('Failed to invalidate host cache:', metadata);
      throw createApiError('Failed to invalidate host cache', 500, metadata);
    }
  }

  async getDockerContainers(hostId: string): Promise<unknown> {
    const client = await this.redisManager.getClient();
    if (!client) return null;

    try {
      const data = await client.get(`${this.CACHE_KEYS.DOCKER.CONTAINERS}:${hostId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
      };
      logger.error('Failed to get docker containers:', metadata);
      throw createApiError('Failed to get docker containers', 500, metadata);
    }
  }

  async cacheDockerContainers(hostId: string, data: unknown): Promise<void> {
    const client = await this.redisManager.getClient();
    if (!client) return;

    try {
      await client.set(
        `${this.CACHE_KEYS.DOCKER.CONTAINERS}:${hostId}`,
        JSON.stringify(data),
        'EX',
        this.CACHE_TTL.DOCKER,
      );
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
      };
      logger.error('Failed to cache docker containers:', metadata);
      throw createApiError('Failed to cache docker containers', 500, metadata);
    }
  }

  async getDockerStacks(hostId: string): Promise<unknown> {
    const client = await this.redisManager.getClient();
    if (!client) return null;

    try {
      const data = await client.get(`${this.CACHE_KEYS.DOCKER.STACKS}:${hostId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
      };
      logger.error('Failed to get docker stacks:', metadata);
      throw createApiError('Failed to get docker stacks', 500, metadata);
    }
  }

  async cacheDockerStacks(hostId: string, data: unknown): Promise<void> {
    const client = await this.redisManager.getClient();
    if (!client) return;

    try {
      await client.set(
        `${this.CACHE_KEYS.DOCKER.STACKS}:${hostId}`,
        JSON.stringify(data),
        'EX',
        this.CACHE_TTL.DOCKER,
      );
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
      };
      logger.error('Failed to cache docker stacks:', metadata);
      throw createApiError('Failed to cache docker stacks', 500, metadata);
    }
  }

  async cacheCommand(
    userId: string,
    hostId: string,
    command: CacheCommand | CacheCommand[],
  ): Promise<void> {
    const client = await this.redisManager.getClient();
    if (!client) return;

    try {
      const key = `${this.CACHE_KEYS.COMMAND}:${userId}:${hostId}`;
      const commands = Array.isArray(command) ? command : [command];
      const serializedCommands = commands.map((cmd: CacheCommand) => JSON.stringify(cmd));
      await client.lpush(key, ...serializedCommands);
      await client.expire(key, this.CACHE_TTL.COMMAND);
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        hostId,
      };
      logger.error('Failed to cache command:', metadata);
      throw createApiError('Failed to cache command', 500, metadata);
    }
  }

  async getCommands(userId: string, hostId: string): Promise<CacheCommand[] | null> {
    const client = await this.redisManager.getClient();
    if (!client) return null;

    try {
      const key = `${this.CACHE_KEYS.COMMAND}:${userId}:${hostId}`;
      const rawCommands = await client.lrange(key, 0, -1);
      if (!Array.isArray(rawCommands)) {
        const metadata: LogMetadata = {
          userId,
          hostId,
          actual: typeof rawCommands,
        };
        logger.error('Invalid response from Redis lrange command:', metadata);
        throw createApiError('Invalid response from Redis lrange command', 500, metadata);
      }
      return rawCommands.map((cmd: string) => JSON.parse(cmd) as CacheCommand);
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        hostId,
      };
      logger.error('Failed to get commands:', metadata);
      throw createApiError('Failed to get commands', 500, metadata);
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();
export default cacheService;
