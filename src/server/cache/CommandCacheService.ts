import { Redis } from 'ioredis';
import { BaseRedisService } from './BaseRedisService';
import { RedisConfig, RedisError } from '../../types/redis';
import { wrapError } from './utils/error';
import { validateKey, serialize, deserialize } from './utils/validation';
import { logger } from '../services/logger';
import type { LogMetadata } from '../../types/logger';
import { LoggingManager } from '../../../../../../../../../utils/logging/LoggingManager';

/**
 * Service for caching command data in Redis
 * Handles command storage, retrieval, and cleanup with TTL
 */
export class CommandCacheService extends BaseRedisService {
  private readonly CACHE_KEY = 'command';
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor(config: RedisConfig) {
    super(config);
  }

  /**
   * Stores command data
   * @param id Command ID
   * @param data Command data
   * @throws RedisError if operation fails
   */
  public async set<T extends Record<string, unknown>>(id: string, data: T): Promise<void> {
    return this.executeOperation<void>(
      'set',
      async () => {
        this.validateKey(id);
        const serialized = serialize(data);
        await this._redis.set(
          `${this.CACHE_KEY}:${id}`,
          serialized,
          'EX',
          this.CACHE_TTL
        );
      },
      { commandId: id }
    );
  }

  /**
   * Retrieves command data
   * @param id Command ID
   * @returns Command data or null if not found
   * @throws RedisError if operation fails
   */
  public async get<T extends Record<string, unknown>>(id: string): Promise<T | null> {
    return this.executeOperation<T | null>(
      'get',
      async () => {
        this.validateKey(id);
        const data = await this._redis.get(`${this.CACHE_KEY}:${id}`);
        if (!data) return null;
        return deserialize<T>(data);
      },
      { commandId: id }
    );
  }

  /**
   * Removes command data
   * @param id Command ID
   * @throws RedisError if operation fails
   */
  public async delete(id: string): Promise<void> {
    return this.executeOperation<void>(
      'delete',
      async () => {
        this.validateKey(id);
        await this._redis.del(`${this.CACHE_KEY}:${id}`);
      },
      { commandId: id }
    );
  }

  /**
   * Lists all command IDs
   * @returns Array of command IDs
   * @throws RedisError if operation fails
   */
  public async listKeys(): Promise<string[]> {
    return this.executeOperation<string[]>(
      'listKeys',
      async () => {
        const keys = await this._redis.keys(`${this.CACHE_KEY}:*`);
        return keys.map(key => key.replace(`${this.CACHE_KEY}:`, ''));
      }
    );
  }

  /**
   * Cleans up expired commands
   * @throws RedisError if operation fails
   */
  public async cleanup(): Promise<void> {
    return this.executeOperation<void>(
      'cleanup',
      async () => {
        const keys = await this._redis.keys(`${this.CACHE_KEY}:*`);
        if (keys.length === 0) return;

        const pipeline = this._redis.pipeline();
        for (const key of keys) {
          pipeline.ttl(key);
        }
        const ttls = await pipeline.exec();
        
        const expiredKeys = keys.filter((_, index) => {
          const ttlResult = ttls?.[index];
          if (!ttlResult) return false;
          const [error, ttl] = ttlResult as [Error | null, number];
          return !error && (ttl === -2 || ttl === -1); // -2: not exists, -1: no TTL
        });

        if (expiredKeys.length > 0) {
          await this._redis.del(...expiredKeys);
          loggerLoggingManager.getInstance().();
        }
      }
    );
  }
}

