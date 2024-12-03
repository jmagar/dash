import { RedisConfig, RedisResult } from '../../../types/redis';
import { AppState } from '../../../types/app';
import { BaseContextService } from './BaseContextService';
import { CACHE_KEYS, CACHE_TTL } from '../keys';
import { ApiError } from '../../../types/errors';
import { logger } from '../../../utils/logger';
import { monitoringService } from '../../../services/monitoring';
import { validateObjectStructure } from '../utils/validation';

/**
 * Service for managing application-level context data in Redis cache.
 * Handles storage and retrieval of app settings, configurations,
 * and runtime states.
 */
export class AppContextService extends BaseContextService {
  constructor(config: RedisConfig) {
    super(config);
  }

  /**
   * Sets the app context for a specific user and project.
   * 
   * @param userId - The ID of the user.
   * @param projectId - The ID of the project.
   * @param context - The app state to store, including:
   *                 - settings: App configuration settings
   *                 - state: Current app state
   *                 - preferences: User-specific app preferences
   * @returns A promise that resolves to 'OK' if successful.
   * @throws ApiError if the operation fails.
   */
  public async setAppContext(
    userId: string,
    projectId: string,
    context: AppState
  ): Promise<RedisResult<'OK'>> {
    return this.executeOperation<RedisResult<'OK'>>(
      'setAppContext',
      async () => {
        if (!userId || !projectId) {
          throw ApiError.badRequest('User ID and Project ID are required');
        }

        if (!this.validateAppState(context)) {
          throw ApiError.badRequest('Invalid app state format');
        }

        return this.setContext(
          userId,
          projectId,
          CACHE_KEYS.APP.CONTEXT,
          context,
          CACHE_TTL.APP.CONTEXT
        );
      },
      { userId, projectId }
    );
  }

  /**
   * Retrieves the app context for a specific user and project.
   * 
   * @param userId - The ID of the user.
   * @param projectId - The ID of the project.
   * @returns A promise that resolves to the app context if found, null otherwise.
   * @throws ApiError if the operation fails.
   */
  public async getAppContext(
    userId: string,
    projectId: string
  ): Promise<RedisResult<AppState | null>> {
    return this.executeOperation<RedisResult<AppState | null>>(
      'getAppContext',
      async () => {
        if (!userId || !projectId) {
          throw ApiError.badRequest('User ID and Project ID are required');
        }

        return this.getContext(userId, projectId, CACHE_KEYS.APP.CONTEXT);
      },
      { userId, projectId }
    );
  }

  /**
   * Clears the app context for a specific user and project.
   * 
   * @param userId - The ID of the user.
   * @param projectId - The ID of the project.
   * @returns A promise that resolves to the number of keys removed.
   * @throws ApiError if the operation fails.
   */
  public async clearAppContext(
    userId: string,
    projectId: string
  ): Promise<RedisResult<number>> {
    return this.executeOperation<RedisResult<number>>(
      'clearAppContext',
      async () => {
        if (!userId || !projectId) {
          throw ApiError.badRequest('User ID and Project ID are required');
        }

        return this.clearContext(userId, projectId, CACHE_KEYS.APP.CONTEXT);
      },
      { userId, projectId }
    );
  }

  /**
   * Validates the app state object structure.
   * @private
   */
  private validateAppState(state: unknown): state is AppState {
    return validateObjectStructure<AppState>(state, {
      settings: 'object',
      state: 'object',
      preferences: 'object'
    });
  }
}
