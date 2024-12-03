import { RedisConfig, RedisResult } from '../../../types/redis';
import { ProcessState } from '../../../types/process';
import { BaseContextService } from './BaseContextService';
import { CACHE_KEYS, CACHE_TTL } from '../keys';
import { ApiError } from '../../../types/errors';
import { logger } from '../../../utils/logger';
import { monitoringService } from '../../../services/monitoring';
import { validateObjectStructure } from '../utils/validation';

/**
 * Service for managing process-related context data in Redis cache.
 * Handles storage and retrieval of running processes, their states,
 * and associated metadata.
 */
export class ProcessContextService extends BaseContextService {
  constructor(config: RedisConfig) {
    super(config);
  }

  /**
   * Sets the process context for a specific user and project.
   * 
   * @param userId - The ID of the user.
   * @param projectId - The ID of the project.
   * @param context - The process state to store, including:
   *                 - pid: Process ID
   *                 - status: Current process status
   *                 - resources: CPU, memory usage
   *                 - metadata: Additional process information
   * @returns A promise that resolves to 'OK' if successful.
   * @throws ApiError if the operation fails.
   */
  public async setProcessContext(
    userId: string,
    projectId: string,
    context: ProcessState
  ): Promise<RedisResult<'OK'>> {
    return this.executeOperation<RedisResult<'OK'>>(
      'setProcessContext',
      async () => {
        if (!userId || !projectId) {
          throw ApiError.badRequest('User ID and Project ID are required');
        }

        if (!this.validateProcessState(context)) {
          throw ApiError.badRequest('Invalid process state format');
        }

        return this.setContext(
          userId,
          projectId,
          CACHE_KEYS.PROCESS.CONTEXT,
          context,
          CACHE_TTL.PROCESS.CONTEXT
        );
      },
      { userId, projectId, processId: context.pid }
    );
  }

  /**
   * Retrieves the process context for a specific user and project.
   * 
   * @param userId - The ID of the user.
   * @param projectId - The ID of the project.
   * @returns A promise that resolves to the process context if found, null otherwise.
   * @throws ApiError if the operation fails.
   */
  public async getProcessContext(
    userId: string,
    projectId: string
  ): Promise<RedisResult<ProcessState | null>> {
    return this.executeOperation<RedisResult<ProcessState | null>>(
      'getProcessContext',
      async () => {
        if (!userId || !projectId) {
          throw ApiError.badRequest('User ID and Project ID are required');
        }

        return this.getContext(userId, projectId, CACHE_KEYS.PROCESS.CONTEXT);
      },
      { userId, projectId }
    );
  }

  /**
   * Clears the process context for a specific user and project.
   * 
   * @param userId - The ID of the user.
   * @param projectId - The ID of the project.
   * @returns A promise that resolves to the number of keys removed.
   * @throws ApiError if the operation fails.
   */
  public async clearProcessContext(
    userId: string,
    projectId: string
  ): Promise<RedisResult<number>> {
    return this.executeOperation<RedisResult<number>>(
      'clearProcessContext',
      async () => {
        if (!userId || !projectId) {
          throw ApiError.badRequest('User ID and Project ID are required');
        }

        return this.clearContext(userId, projectId, CACHE_KEYS.PROCESS.CONTEXT);
      },
      { userId, projectId }
    );
  }

  /**
   * Validates the process state object structure.
   * @private
   */
  private validateProcessState(state: unknown): state is ProcessState {
    return validateObjectStructure<ProcessState>(state, {
      pid: 'number',
      status: 'string',
      resources: 'object',
      metadata: 'object'
    });
  }
}
