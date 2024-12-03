import { Redis } from 'ioredis';
import { BaseRedisService } from './BaseRedisService';
import { RedisConfig, RedisError } from '../../types/redis';
import { wrapError } from './utils/error';
import { validateKey, serialize, deserialize } from './utils/validation';
import { logger } from '../services/logger';
import type { LogMetadata } from '../../types/logger';
import { LoggingManager } from '../../../../../../../../../utils/logging/LoggingManager';

/**
 * Base class for Redis cache services with common CRUD operations
 */
export abstract class BaseCacheService extends BaseRedisService {
  protected abstract readonly CACHE_KEY: string;
  protected abstract readonly CACHE_TTL: number;

  constructor(config: RedisConfig) {
    super(config);
  }

  /**
   * Stores data in cache
   */
  public async set<T extends Record<string, unknown>>(
    id: string,
    data: T,
    metadata?: Record<string, unknown>
  ): Promise<void> {
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
      { id, ...metadata }
    );
  }

  /**
   * Retrieves data from cache
   */
  public async get<T extends Record<string, unknown>>(
    id: string,
    metadata?: Record<string, unknown>
  ): Promise<T | null> {
    return this.executeOperation<T | null>(
      'get',
      async () => {
        this.validateKey(id);
        const data = await this._redis.get(`${this.CACHE_KEY}:${id}`);
        if (!data) return null;
        return deserialize<T>(data);
      },
      { id, ...metadata }
    );
  }

  /**
   * Removes data from cache
   */
  public async delete(id: string, metadata?: Record<string, unknown>): Promise<void> {
    return this.executeOperation<void>(
      'delete',
      async () => {
        this.validateKey(id);
        await this._redis.del(`${this.CACHE_KEY}:${id}`);
      },
      { id, ...metadata }
    );
  }

  /**
   * Lists all cache keys
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
   * Cleans up expired cache entries
   */
  protected async cleanupExpired(): Promise<void> {
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

  /**
   * Mask sensitive data for logging
   */
  protected maskSensitiveData(value: string): string {
    if (!value) return value;
    if (value.length <= 8) return '*'.repeat(value.length);
    return value.slice(0, 4) + '*'.repeat(value.length - 8) + value.slice(-4);
  }
}

