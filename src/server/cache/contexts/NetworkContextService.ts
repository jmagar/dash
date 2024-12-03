import { RedisConfig, RedisResult } from '../../../types/redis';
import { NetworkState } from '../../../types/network';
import { BaseContextService } from './BaseContextService';
import { CACHE_KEYS, CACHE_TTL } from '../keys';
import { ApiError } from '../../../types/errors';
import { logger } from '../../../utils/logger';
import { monitoringService } from '../../../services/monitoring';
import { validateObjectStructure } from '../utils/validation';

/**
 * Service for managing network-related context data in Redis cache.
 * Handles storage and retrieval of network connections, states,
 * and performance metrics.
 */
export class NetworkContextService extends BaseContextService {
  constructor(config: RedisConfig) {
    super(config);
  }

  /**
   * Sets the network context for a specific user and project.
   * 
   * @param userId - The ID of the user.
   * @param projectId - The ID of the project.
   * @param context - The network state to store, including:
   *                 - connections: Active network connections
   *                 - metrics: Network performance metrics
   *                 - status: Connection status and health
   * @returns A promise that resolves to 'OK' if successful.
   * @throws ApiError if the operation fails.
   */
  public async setNetworkContext(
    userId: string,
    projectId: string,
    context: NetworkState
  ): Promise<RedisResult<'OK'>> {
    return this.executeOperation<RedisResult<'OK'>>(
      'setNetworkContext',
      async () => {
        if (!userId || !projectId) {
          throw ApiError.badRequest('User ID and Project ID are required');
        }

        if (!this.validateNetworkState(context)) {
          throw ApiError.badRequest('Invalid network state format');
        }

        return this.setContext(
          userId,
          projectId,
          CACHE_KEYS.NETWORK.CONTEXT,
          context,
          CACHE_TTL.NETWORK.CONTEXT
        );
      },
      { userId, projectId }
    );
  }

  /**
   * Retrieves the network context for a specific user and project.
   * 
   * @param userId - The ID of the user.
   * @param projectId - The ID of the project.
   * @returns A promise that resolves to the network context if found, null otherwise.
   * @throws ApiError if the operation fails.
   */
  public async getNetworkContext(
    userId: string,
    projectId: string
  ): Promise<RedisResult<NetworkState | null>> {
    return this.executeOperation<RedisResult<NetworkState | null>>(
      'getNetworkContext',
      async () => {
        if (!userId || !projectId) {
          throw ApiError.badRequest('User ID and Project ID are required');
        }

        return this.getContext(userId, projectId, CACHE_KEYS.NETWORK.CONTEXT);
      },
      { userId, projectId }
    );
  }

  /**
   * Clears the network context for a specific user and project.
   * 
   * @param userId - The ID of the user.
   * @param projectId - The ID of the project.
   * @returns A promise that resolves to the number of keys removed.
   * @throws ApiError if the operation fails.
   */
  public async clearNetworkContext(
    userId: string,
    projectId: string
  ): Promise<RedisResult<number>> {
    return this.executeOperation<RedisResult<number>>(
      'clearNetworkContext',
      async () => {
        if (!userId || !projectId) {
          throw ApiError.badRequest('User ID and Project ID are required');
        }

        return this.clearContext(userId, projectId, CACHE_KEYS.NETWORK.CONTEXT);
      },
      { userId, projectId }
    );
  }

  /**
   * Validates the network state object structure.
   * @private
   */
  private validateNetworkState(state: unknown): state is NetworkState {
    return validateObjectStructure<NetworkState>(state, {
      connections: 'array',
      metrics: 'object',
      status: 'object'
    });
  }
}
