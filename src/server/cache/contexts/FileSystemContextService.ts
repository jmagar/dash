import { RedisConfig, RedisResult } from '../../../types/redis';
import { FileSystemState } from '../../../types/filesystem';
import { BaseContextService } from './BaseContextService';
import { CACHE_KEYS, CACHE_TTL } from '../keys';
import { ApiError } from '../../../types/errors';
import { logger } from '../../../utils/logger';
import { monitoringService } from '../../../services/monitoring';
import { validateObjectStructure } from '../utils/validation';

/**
 * Service for managing filesystem-related context data in Redis cache.
 * Handles storage and retrieval of file operations, states,
 * and filesystem metrics.
 */
export class FileSystemContextService extends BaseContextService {
  constructor(config: RedisConfig) {
    super(config);
  }

  /**
   * Sets the filesystem context for a specific user and project.
   * 
   * @param userId - The ID of the user.
   * @param projectId - The ID of the project.
   * @param context - The filesystem state to store, including:
   *                 - operations: Active file operations
   *                 - watchedPaths: Monitored file paths
   *                 - metrics: Filesystem performance metrics
   * @returns A promise that resolves to 'OK' if successful.
   * @throws ApiError if the operation fails.
   */
  public async setFileSystemContext(
    userId: string,
    projectId: string,
    context: FileSystemState
  ): Promise<RedisResult<'OK'>> {
    return this.executeOperation<RedisResult<'OK'>>(
      'setFileSystemContext',
      async () => {
        if (!userId || !projectId) {
          throw ApiError.badRequest('User ID and Project ID are required');
        }

        if (!this.validateFileSystemState(context)) {
          throw ApiError.badRequest('Invalid filesystem state format');
        }

        return this.setContext(
          userId,
          projectId,
          CACHE_KEYS.FILESYSTEM.CONTEXT,
          context,
          CACHE_TTL.FILESYSTEM.CONTEXT
        );
      },
      { userId, projectId }
    );
  }

  /**
   * Retrieves the filesystem context for a specific user and project.
   * 
   * @param userId - The ID of the user.
   * @param projectId - The ID of the project.
   * @returns A promise that resolves to the filesystem context if found, null otherwise.
   * @throws ApiError if the operation fails.
   */
  public async getFileSystemContext(
    userId: string,
    projectId: string
  ): Promise<RedisResult<FileSystemState | null>> {
    return this.executeOperation<RedisResult<FileSystemState | null>>(
      'getFileSystemContext',
      async () => {
        if (!userId || !projectId) {
          throw ApiError.badRequest('User ID and Project ID are required');
        }

        return this.getContext(userId, projectId, CACHE_KEYS.FILESYSTEM.CONTEXT);
      },
      { userId, projectId }
    );
  }

  /**
   * Clears the filesystem context for a specific user and project.
   * 
   * @param userId - The ID of the user.
   * @param projectId - The ID of the project.
   * @returns A promise that resolves to the number of keys removed.
   * @throws ApiError if the operation fails.
   */
  public async clearFileSystemContext(
    userId: string,
    projectId: string
  ): Promise<RedisResult<number>> {
    return this.executeOperation<RedisResult<number>>(
      'clearFileSystemContext',
      async () => {
        if (!userId || !projectId) {
          throw ApiError.badRequest('User ID and Project ID are required');
        }

        return this.clearContext(userId, projectId, CACHE_KEYS.FILESYSTEM.CONTEXT);
      },
      { userId, projectId }
    );
  }

  /**
   * Validates the filesystem state object structure.
   * @private
   */
  private validateFileSystemState(state: unknown): state is FileSystemState {
    return validateObjectStructure<FileSystemState>(state, {
      operations: 'object',
      watchedPaths: 'object',
      metrics: 'object'
    });
  }
}
