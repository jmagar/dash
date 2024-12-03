import { Redis } from 'ioredis';
import { logger } from '../../utils/logger';
import { validate } from '../../utils/validation/validator';
import { handleError } from '../../utils/error/errorHandler';
import { z } from 'zod';

export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  ttl?: number;
}

export interface CacheMetadata {
  key: string;
  operation: string;
  duration?: number;
  error?: string;
}

const defaultConfig: Partial<CacheConfig> = {
  db: 0,
  ttl: 3600, // 1 hour default TTL
};

export abstract class BaseCacheService {
  protected readonly client: Redis;
  protected readonly keyPrefix: string;
  protected readonly defaultTTL: number;

  constructor(config: CacheConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    this.keyPrefix = finalConfig.keyPrefix || '';
    this.defaultTTL = finalConfig.ttl || 3600;

    this.client = new Redis({
      host: finalConfig.host,
      port: finalConfig.port,
      password: finalConfig.password,
      db: finalConfig.db,
      keyPrefix: this.keyPrefix,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    this.client.on('error', (error) => {
      handleError(error, {
        code: 'REDIS_ERROR',
        metadata: {
          component: this.constructor.name
        }
      });
    });
  }

  /**
   * Get a value from cache
   */
  protected async get<T>(key: string, schema?: z.ZodType<T>): Promise<T | null> {
    const startTime = Date.now();
    const metadata: CacheMetadata = {
      key,
      operation: 'get'
    };

    try {
      const data = await this.client.get(key);
      if (!data) return null;

      const parsed = JSON.parse(data);
      
      if (schema) {
        return validate(schema, parsed);
      }

      return parsed;
    } catch (error) {
      metadata.error = error instanceof Error ? error.message : 'Unknown error';
      metadata.duration = Date.now() - startTime;
      
      handleError(error, {
        code: 'CACHE_GET_ERROR',
        metadata
      });
      
      return null;
    }
  }

  /**
   * Set a value in cache
   */
  protected async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const startTime = Date.now();
    const metadata: CacheMetadata = {
      key,
      operation: 'set'
    };

    try {
      const serialized = JSON.stringify(value);
      const finalTTL = ttl || this.defaultTTL;

      await this.client.setex(key, finalTTL, serialized);
    } catch (error) {
      metadata.error = error instanceof Error ? error.message : 'Unknown error';
      metadata.duration = Date.now() - startTime;
      
      handleError(error, {
        code: 'CACHE_SET_ERROR',
        metadata
      });
    }
  }

  /**
   * Delete a value from cache
   */
  protected async delete(key: string): Promise<void> {
    const startTime = Date.now();
    const metadata: CacheMetadata = {
      key,
      operation: 'delete'
    };

    try {
      await this.client.del(key);
    } catch (error) {
      metadata.error = error instanceof Error ? error.message : 'Unknown error';
      metadata.duration = Date.now() - startTime;
      
      handleError(error, {
        code: 'CACHE_DELETE_ERROR',
        metadata
      });
    }
  }

  /**
   * Check if a key exists in cache
   */
  protected async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      handleError(error, {
        code: 'CACHE_EXISTS_ERROR',
        metadata: {
          key,
          operation: 'exists'
        }
      });
      return false;
    }
  }

  /**
   * Get the TTL of a key
   */
  protected async getTTL(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      handleError(error, {
        code: 'CACHE_TTL_ERROR',
        metadata: {
          key,
          operation: 'ttl'
        }
      });
      return -1;
    }
  }

  /**
   * Close the Redis connection
   */
  public async close(): Promise<void> {
    try {
      await this.client.quit();
    } catch (error) {
      handleError(error, {
        code: 'CACHE_CLOSE_ERROR',
        metadata: {
          operation: 'close'
        }
      });
    }
  }
}
