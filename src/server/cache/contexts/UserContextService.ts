import { RedisConfig, RedisResult } from '../../../types/redis';
import { UserState } from '../../../types/user';
import { BaseContextService } from './BaseContextService';
import { CACHE_KEYS, CACHE_TTL } from '../keys';
import { ApiError } from '../../../types/errors';
import { logger } from '../../../utils/logger';
import { monitoringService } from '../../../services/monitoring';
import { validateObjectStructure } from '../utils/validation';

/**
 * Service for managing user-related context data in Redis cache.
 * Handles storage and retrieval of user preferences, settings,
 * and session information.
 */
export class UserContextService extends BaseContextService {
  constructor(config: RedisConfig) {
    super(config);
  }

  /**
   * Sets the user context for a specific user and project.
   * 
   * @param userId - The ID of the user.
   * @param projectId - The ID of the project.
   * @param context - The user state to store, including:
   *                 - preferences: User preferences
   *                 - settings: User settings
   *                 - session: Current session data
   * @returns A promise that resolves to 'OK' if successful.
   * @throws ApiError if the operation fails.
   */
  public async setUserContext(
    userId: string,
    projectId: string,
    context: UserState
  ): Promise<RedisResult<'OK'>> {
    return this.executeOperation<RedisResult<'OK'>>(
      'setUserContext',
      async () => {
        if (!userId || !projectId) {
          throw ApiError.badRequest('User ID and Project ID are required');
        }

        if (!this.validateUserState(context)) {
          throw ApiError.badRequest('Invalid user state format');
        }

        return this.setContext(
          userId,
          projectId,
          CACHE_KEYS.USER.CONTEXT,
          context,
          CACHE_TTL.USER.CONTEXT
        );
      },
      { userId, projectId }
    );
  }

  /**
   * Retrieves the user context for a specific user and project.
   * 
   * @param userId - The ID of the user.
   * @param projectId - The ID of the project.
   * @returns A promise that resolves to the user context if found, null otherwise.
   * @throws ApiError if the operation fails.
   */
  public async getUserContext(
    userId: string,
    projectId: string
  ): Promise<RedisResult<UserState | null>> {
    return this.executeOperation<RedisResult<UserState | null>>(
      'getUserContext',
      async () => {
        if (!userId || !projectId) {
          throw ApiError.badRequest('User ID and Project ID are required');
        }

        return this.getContext(userId, projectId, CACHE_KEYS.USER.CONTEXT);
      },
      { userId, projectId }
    );
  }

  /**
   * Clears the user context for a specific user and project.
   * 
   * @param userId - The ID of the user.
   * @param projectId - The ID of the project.
   * @returns A promise that resolves to the number of keys removed.
   * @throws ApiError if the operation fails.
   */
  public async clearUserContext(
    userId: string,
    projectId: string
  ): Promise<RedisResult<number>> {
    return this.executeOperation<RedisResult<number>>(
      'clearUserContext',
      async () => {
        if (!userId || !projectId) {
          throw ApiError.badRequest('User ID and Project ID are required');
        }

        return this.clearContext(userId, projectId, CACHE_KEYS.USER.CONTEXT);
      },
      { userId, projectId }
    );
  }

  /**
   * Validates the user state object structure.
   * @private
   */
  private validateUserState(state: unknown): state is UserState {
    return validateObjectStructure<UserState>(state, {
      preferences: 'object',
      settings: 'object',
      session: 'object'
    });
  }
}
