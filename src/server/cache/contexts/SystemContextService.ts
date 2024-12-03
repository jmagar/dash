import { RedisConfig, RedisResult } from '../../../types/redis';
import { SystemState } from '../../../types/chatbot';
import { BaseContextService } from './BaseContextService';
import { CACHE_KEYS, CACHE_TTL } from '../keys';
import { ApiError } from '../../../types/errors';
import { logger } from '../../../utils/logger';
import { monitoringService } from '../../../services/monitoring';
import { validateObjectStructure } from '../utils/validation';

/**
 * Service for managing system-wide context data in Redis cache.
 * Handles storage and retrieval of system events, alerts, and dependencies.
 */
export class SystemContextService extends BaseContextService {
  constructor(config: RedisConfig) {
    super(config);
  }

  /**
   * Sets the system context for a specific user and project.
   * 
   * @param userId - The ID of the user.
   * @param projectId - The ID of the project.
   * @param context - The system context to store, including:
   *                 - events: System-wide events and notifications
   *                 - alerts: System alerts and critical warnings
   *                 - dependencies: System dependencies and their states
   * @returns A promise that resolves to 'OK' if successful.
   * @throws ApiError if the operation fails.
   */
  public async setSystemContext(
    userId: string,
    projectId: string,
    context: SystemState
  ): Promise<RedisResult<'OK'>> {
    return this.executeOperation<RedisResult<'OK'>>(
      'setSystemContext',
      async () => {
        if (!userId || !projectId) {
          throw ApiError.badRequest('User ID and Project ID are required');
        }

        if (!this.validateSystemState(context)) {
          throw ApiError.badRequest('Invalid system state format');
        }

        return this.setContext(
          userId,
          projectId,
          CACHE_KEYS.SYSTEM.CONTEXT,
          context,
          CACHE_TTL.SYSTEM.CONTEXT
        );
      },
      { userId, projectId }
    );
  }

  /**
   * Retrieves the system context for a specific user and project.
   * 
   * @param userId - The ID of the user.
   * @param projectId - The ID of the project.
   * @returns A promise that resolves to the system context if found, null otherwise.
   * @throws ApiError if the operation fails.
   */
  public async getSystemContext(
    userId: string,
    projectId: string
  ): Promise<RedisResult<SystemState | null>> {
    return this.executeOperation<RedisResult<SystemState | null>>(
      'getSystemContext',
      async () => {
        if (!userId || !projectId) {
          throw ApiError.badRequest('User ID and Project ID are required');
        }

        return this.getContext(userId, projectId, CACHE_KEYS.SYSTEM.CONTEXT);
      },
      { userId, projectId }
    );
  }

  /**
   * Clears the system context for a specific user and project.
   * 
   * @param userId - The ID of the user.
   * @param projectId - The ID of the project.
   * @returns A promise that resolves to the number of keys removed.
   * @throws ApiError if the operation fails.
   */
  public async clearSystemContext(
    userId: string,
    projectId: string
  ): Promise<RedisResult<number>> {
    return this.executeOperation<RedisResult<number>>(
      'clearSystemContext',
      async () => {
        if (!userId || !projectId) {
          throw ApiError.badRequest('User ID and Project ID are required');
        }

        return this.clearContext(userId, projectId, CACHE_KEYS.SYSTEM.CONTEXT);
      },
      { userId, projectId }
    );
  }

  /**
   * Validates the system state object structure.
   * @private
   */
  private validateSystemState(state: unknown): state is SystemState {
    return validateObjectStructure<SystemState>(state, {
      events: 'array',
      alerts: 'array',
      dependencies: 'object'
    });
  }
}
