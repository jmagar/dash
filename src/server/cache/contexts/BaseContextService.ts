import { RedisConfig, RedisResult } from '../../../types/redis';
import { BaseRedisService } from '../BaseRedisService';
import { logger } from '../../../utils/logger';
import { metrics } from '../../../utils/metrics';
import { errorAggregator } from '../../../services/errorAggregator';
import { getErrorMessage } from '../utils/error';

/**
 * Base class for all context-specific Redis services.
 * Provides common functionality for context management including:
 * - Key management and validation
 * - Metrics collection
 * - Error handling
 * - Redis operations with proper type safety
 */
export abstract class BaseContextService extends BaseRedisService {
  constructor(config: RedisConfig) {
    super(config);
  }

  /**
   * Generates a unique key for a given context.
   * 
   * @param userId - The ID of the user.
   * @param projectId - The ID of the project.
   * @param contextType - The type of context.
   * @returns A unique key for the given context.
   */
  protected getContextKey(userId: string, projectId: string, contextType: string): string {
    return `context:${contextType}:${userId}:${projectId}`;
  }

  /**
   * Validates a given key.
   * 
   * @param key - The key to validate.
   * @throws RedisError if the key is invalid.
   */
  protected validateKey(key: string): void {
    if (!key?.trim()) {
      throw new Error('Invalid key');
    }

    if (key.length > 512) {
      throw new Error('Key exceeds maximum length');
    }
  }

  /**
   * Executes an operation with metrics collection.
   * 
   * @param operation - The operation to execute.
   * @param metadata - Additional metadata for metrics collection.
   * @returns The result of the operation.
   */
  protected async withMetrics<T>(
    operation: () => Promise<T>,
    metadata: Record<string, unknown>
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await operation();
      metrics.timing('cache.context.operation', Date.now() - startTime, { ...metadata, success: true });
      return result;
    } catch (error) {
      metrics.timing('cache.context.operation', Date.now() - startTime, { ...metadata, success: false });
      errorAggregator.addError(error as Error, {
        service: this.constructor.name,
        error: getErrorMessage(error),
        ...metadata
      });
      throw error;
    }
  }

  /**
   * Sets a context for a given user and project.
   * 
   * @param userId - The ID of the user.
   * @param projectId - The ID of the project.
   * @param contextType - The type of context.
   * @param context - The context to set.
   * @param ttlMs - The time to live in milliseconds.
   * @returns The result of the operation.
   */
  protected async setContext<T>(
    userId: string,
    projectId: string,
    contextType: string,
    context: T,
    ttlMs?: number
  ): Promise<RedisResult<'OK'>> {
    return this.executeOperation('setContext', async () => {
      const key = this.getContextKey(userId, projectId, contextType);
      this.validateKey(key);

      const metadata = {
        operation: 'setContext',
        contextType,
        userId,
        projectId,
      };

      return this.withMetrics(async () => {
        if (ttlMs) {
          return await this._redis.set(key, JSON.stringify(context), 'PX', ttlMs);
        }
        return await this._redis.set(key, JSON.stringify(context));
      }, metadata);
    });
  }

  /**
   * Gets a context for a given user and project.
   * 
   * @param userId - The ID of the user.
   * @param projectId - The ID of the project.
   * @param contextType - The type of context.
   * @returns The context or null if not found.
   */
  protected async getContext<T>(
    userId: string,
    projectId: string,
    contextType: string
  ): Promise<RedisResult<T | null>> {
    return this.executeOperation('getContext', async () => {
      const key = this.getContextKey(userId, projectId, contextType);
      this.validateKey(key);

      const metadata = {
        operation: 'getContext',
        contextType,
        userId,
        projectId,
      };

      return this.withMetrics(async () => {
        const data = await this._redis.get(key);
        return data ? JSON.parse(data) : null;
      }, metadata);
    });
  }

  /**
   * Clears a context for a given user and project.
   * 
   * @param userId - The ID of the user.
   * @param projectId - The ID of the project.
   * @param contextType - The type of context.
   * @returns The result of the operation.
   */
  protected async clearContext(
    userId: string,
    projectId: string,
    contextType: string
  ): Promise<RedisResult<number>> {
    return this.executeOperation('clearContext', async () => {
      const key = this.getContextKey(userId, projectId, contextType);
      this.validateKey(key);

      const metadata = {
        operation: 'clearContext',
        contextType,
        userId,
        projectId,
      };

      return this.withMetrics(async () => {
        return await this._redis.del(key);
      }, metadata);
    });
  }
}
