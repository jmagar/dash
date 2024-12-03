import { Redis } from 'ioredis';
import { BaseRedisService } from './BaseRedisService';
import { RedisConfig, RedisError } from '../../types/redis';
import { wrapError } from './utils/error';
import { validateKey, serialize, deserialize } from './utils/validation';
import { logger } from '../services/logger';
import type { LogMetadata } from '../../types/logger';
import { LoggingManager } from '../../../../../../../../../utils/logging/LoggingManager';

/**
 * Service for caching host-related data in Redis
 * Handles host data with TTL-based expiration
 */
export class HostCacheService extends BaseRedisService {
  private readonly CACHE_KEY = 'host' as const;
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(config: RedisConfig) {
    super(config);
  }

  /**
   * Stores host data
   * @param id Host identifier
   * @param data Host data
   * @throws RedisError if operation fails
   */
  public async set<T extends Record<string, unknown>>(id: string, data: T): Promise<void> {
    return this.executeOperation<void>(
      'set',
      async () => {
        this.validateKey(id);
        const serialized = this.serialize(data);
        await this._redis.set(
          `${this.CACHE_KEY}:${id}`,
          serialized,
          'EX',
          this.CACHE_TTL
        );
      },
      { hostId: id }
    );
  }

  /**
   * Retrieves host data by ID
   * @param id Host identifier
   * @returns Host data or null if not found
   * @throws RedisError if operation fails
   */
  public async get<T extends Record<string, unknown>>(id: string): Promise<T | null> {
    return this.executeOperation<T | null>(
      'get',
      async () => {
        this.validateKey(id);
        const data = await this._redis.get(`${this.CACHE_KEY}:${id}`);
        if (!data) return null;
        return this.deserialize<T>(data);
      },
      { hostId: id }
    );
  }

  /**
   * Removes host data
   * @param id Host identifier
   * @throws RedisError if operation fails
   */
  public async delete(id: string): Promise<void> {
    return this.executeOperation<void>(
      'delete',
      async () => {
        this.validateKey(id);
        await this._redis.del(`${this.CACHE_KEY}:${id}`);
      },
      { hostId: id }
    );
  }

  /**
   * Lists all host IDs
   * @returns Array of host IDs
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
   * Cleans up expired host data
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

  private validateKey(id: string): void {
    validateKey(id, 'Invalid host ID');
  }

  private serialize<T extends Record<string, unknown>>(data: T): string {
    return serialize(data);
  }

  private deserialize<T extends Record<string, unknown>>(data: string): T {
    return deserialize<T>(data);
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
}

