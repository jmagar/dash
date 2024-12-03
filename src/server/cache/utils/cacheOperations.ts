import { RedisConfig, RedisResult } from '../../../types/redis';
import { BaseRedisService } from '../BaseRedisService';
import { metrics } from '../../services/metrics';
import { validateKey, validateValue, validateTTL, serialize, deserialize } from './validation';
import { wrapError } from './error';

/**
 * Base class providing shared cache operations for both state and context services.
 * Centralizes common functionality to reduce code duplication.
 */
export abstract class BaseCacheOperations extends BaseRedisService {
  private readonly prefix: string;

  constructor(config: RedisConfig, prefix: 'state' | 'context') {
    super(config);
    this.prefix = prefix;
  }

  /**
   * Generates a unique key for a given data item.
   */
  protected getKey(userId: string, projectId: string, type: string): string {
    return `${this.prefix}:${type}:${userId}:${projectId}`;
  }

  /**
   * Executes an operation with metrics collection.
   */
  protected async withMetrics<T>(
    operation: () => Promise<T>,
    metadata: Record<string, unknown>
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await operation();
      metrics.timing(`cache.${this.prefix}.operation`, Date.now() - startTime, { ...metadata, success: true });
      return result;
    } catch (error) {
      metrics.timing(`cache.${this.prefix}.operation`, Date.now() - startTime, { ...metadata, success: false });
      throw wrapError(error, `${this.prefix} operation failed: ${metadata.operation}`, {
        service: this.constructor.name,
        ...metadata
      });
    }
  }

  /**
   * Sets data for a given user and project.
   */
  protected async setData<T>(
    userId: string,
    projectId: string,
    type: string,
    data: T,
    ttlMs?: number
  ): Promise<RedisResult<'OK'>> {
    return this.executeOperation('setData', async () => {
      const key = this.getKey(userId, projectId, type);
      validateKey(key);
      validateValue(data);
      if (ttlMs !== undefined) {
        validateTTL(ttlMs);
      }

      const metadata = {
        operation: 'setData',
        type,
        userId,
        projectId,
      };

      return this.withMetrics(async () => {
        const serialized = serialize(data);
        if (ttlMs) {
          return await this._redis.set(key, serialized, 'PX', ttlMs);
        }
        return await this._redis.set(key, serialized);
      }, metadata);
    });
  }

  /**
   * Gets data for a given user and project.
   */
  protected async getData<T>(
    userId: string,
    projectId: string,
    type: string
  ): Promise<RedisResult<T | null>> {
    return this.executeOperation('getData', async () => {
      const key = this.getKey(userId, projectId, type);
      validateKey(key);

      const metadata = {
        operation: 'getData',
        type,
        userId,
        projectId,
      };

      return this.withMetrics(async () => {
        const data = await this._redis.get(key);
        return data ? deserialize<T>(data) : null;
      }, metadata);
    });
  }

  /**
   * Clears data for a given user and project.
   */
  protected async clearData(
    userId: string,
    projectId: string,
    type: string
  ): Promise<RedisResult<number>> {
    return this.executeOperation('clearData', async () => {
      const key = this.getKey(userId, projectId, type);
      validateKey(key);

      const metadata = {
        operation: 'clearData',
        type,
        userId,
        projectId,
      };

      return this.withMetrics(async () => {
        return await this._redis.del(key);
      }, metadata);
    });
  }
}
