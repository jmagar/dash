import { RedisConfig, RedisResult } from '../../../types/redis';
import { BaseRedisService } from '../BaseRedisService';
import { logger } from '../../services/logger';
import { metrics } from '../../services/metrics';
import { errorAggregator } from '../../services/errorAggregator';
import { validateKey, validateValue, validateTTL, serialize, deserialize } from '../utils/validation';
import { wrapError } from '../utils/error';
import { BaseCacheOperations } from '../utils/cacheOperations';

/**
 * Base class for all state-specific Redis services.
 * Extends BaseCacheOperations to share common functionality with context services.
 */
export abstract class BaseStateService extends BaseCacheOperations {
  constructor(config: RedisConfig) {
    super(config, 'state');
  }

  /**
   * Sets a state for a given user and project.
   */
  protected async setState<T>(
    userId: string,
    projectId: string,
    stateType: string,
    state: T,
    ttlMs?: number
  ): Promise<RedisResult<'OK'>> {
    return this.setData(userId, projectId, stateType, state, ttlMs);
  }

  /**
   * Gets a state for a given user and project.
   */
  protected async getState<T>(
    userId: string,
    projectId: string,
    stateType: string
  ): Promise<RedisResult<T | null>> {
    return this.getData<T>(userId, projectId, stateType);
  }

  /**
   * Clears a state for a given user and project.
   */
  protected async clearState(
    userId: string,
    projectId: string,
    stateType: string
  ): Promise<RedisResult<number>> {
    return this.clearData(userId, projectId, stateType);
  }
}
