import type { Container, Stack } from '../../types/models-shared';
import { BaseRedisService } from './BaseRedisService';
import { LoggingManager } from '../utils/logging/LoggingManager';
import type { RedisError, RedisErrorCode } from '../../types/redis';
import type { LogMetadata } from '../../types/logger';
import { validateKey, serialize, deserialize } from './utils/validation';
import { getErrorMessage, getErrorCode, wrapError } from './utils/error';

/**
 * Service for caching Docker-related data in Redis
 * Handles container and stack data with TTL-based expiration
 */
export class DockerCacheService extends BaseRedisService {
  private readonly CACHE_KEYS = {
    CONTAINERS: 'docker:containers',
    STACKS: 'docker:stacks'
  } as const;

  private readonly CACHE_TTL = {
    CONTAINERS: 300, // 5 minutes
    STACKS: 300 // 5 minutes
  } as const;

  /**
   * Retrieves containers for a host
   * @param hostId Host identifier
   * @returns Array of containers or null if not found
   * @throws RedisError if operation fails
   */
  public async getContainers<T extends Container>(hostId: string): Promise<T[] | null> {
    return this.executeOperation<T[] | null>(
      'getContainers',
      async () => {
        this.validateKey(hostId);
        const data = await this._redis.get(`${this.CACHE_KEYS.CONTAINERS}:${hostId}`);
        if (!data) return null;
        return this.deserialize<T[]>(data);
      },
      { hostId }
    );
  }

  /**
   * Stores containers for a host
   * @param hostId Host identifier
   * @param containers Array of containers
   * @throws RedisError if operation fails
   */
  public async setContainers<T extends Container>(hostId: string, containers: T[]): Promise<void> {
    return this.executeOperation<void>(
      'setContainers',
      async () => {
        this.validateKey(hostId);
        const serialized = this.serialize(containers);
        await this._redis.set(
          `${this.CACHE_KEYS.CONTAINERS}:${hostId}`,
          serialized,
          'EX',
          this.CACHE_TTL.CONTAINERS
        );
      },
      { hostId, containerCount: containers.length }
    );
  }

  /**
   * Removes containers for a host
   * @param hostId Host identifier
   * @throws RedisError if operation fails
   */
  public async deleteContainers(hostId: string): Promise<void> {
    return this.executeOperation<void>(
      'deleteContainers',
      async () => {
        this.validateKey(hostId);
        await this._redis.del(`${this.CACHE_KEYS.CONTAINERS}:${hostId}`);
      },
      { hostId }
    );
  }

  /**
   * Retrieves stacks for a host
   * @param hostId Host identifier
   * @returns Array of stacks or null if not found
   * @throws RedisError if operation fails
   */
  public async getStacks<T extends Stack>(hostId: string): Promise<T[] | null> {
    return this.executeOperation<T[] | null>(
      'getStacks',
      async () => {
        this.validateKey(hostId);
        const data = await this._redis.get(`${this.CACHE_KEYS.STACKS}:${hostId}`);
        if (!data) return null;
        return this.deserialize<T[]>(data);
      },
      { hostId }
    );
  }

  /**
   * Stores stacks for a host
   * @param hostId Host identifier
   * @param stacks Array of stacks
   * @throws RedisError if operation fails
   */
  public async setStacks<T extends Stack>(hostId: string, stacks: T[]): Promise<void> {
    return this.executeOperation<void>(
      'setStacks',
      async () => {
        this.validateKey(hostId);
        const serialized = this.serialize(stacks);
        await this._redis.set(
          `${this.CACHE_KEYS.STACKS}:${hostId}`,
          serialized,
          'EX',
          this.CACHE_TTL.STACKS
        );
      },
      { hostId, stackCount: stacks.length }
    );
  }

  /**
   * Removes stacks for a host
   * @param hostId Host identifier
   * @throws RedisError if operation fails
   */
  public async deleteStacks(hostId: string): Promise<void> {
    return this.executeOperation<void>(
      'deleteStacks',
      async () => {
        this.validateKey(hostId);
        await this._redis.del(`${this.CACHE_KEYS.STACKS}:${hostId}`);
      },
      { hostId }
    );
  }

  /**
   * Lists all host IDs with Docker data
   * @returns Array of host IDs
   * @throws RedisError if operation fails
   */
  public async listHosts(): Promise<string[]> {
    return this.executeOperation<string[]>(
      'listHosts',
      async () => {
        const containerKeys = await this._redis.keys(`${this.CACHE_KEYS.CONTAINERS}:*`);
        const stackKeys = await this._redis.keys(`${this.CACHE_KEYS.STACKS}:*`);
        
        const containerHosts = containerKeys.map(key => key.replace(`${this.CACHE_KEYS.CONTAINERS}:`, ''));
        const stackHosts = stackKeys.map(key => key.replace(`${this.CACHE_KEYS.STACKS}:`, ''));
        
        return [...new Set([...containerHosts, ...stackHosts])];
      }
    );
  }

  /**
   * Cleans up expired Docker data
   * @throws RedisError if operation fails
   */
  public async cleanup(): Promise<void> {
    return this.executeOperation<void>(
      'cleanup',
      async () => {
        const hosts = await this.listHosts();
        if (hosts.length === 0) return;

        const pipeline = this._redis.pipeline();
        for (const hostId of hosts) {
          pipeline.ttl(`${this.CACHE_KEYS.CONTAINERS}:${hostId}`);
          pipeline.ttl(`${this.CACHE_KEYS.STACKS}:${hostId}`);
        }
        const ttls = await pipeline.exec();
        
        const expiredKeys: string[] = [];
        hosts.forEach((hostId, index) => {
          const containerTtl = ttls?.[index * 2];
          const stackTtl = ttls?.[index * 2 + 1];
          
          if (containerTtl) {
            const [error, ttl] = containerTtl as [Error | null, number];
            if (!error && (ttl === -2 || ttl === -1)) {
              expiredKeys.push(`${this.CACHE_KEYS.CONTAINERS}:${hostId}`);
            }
          }
          
          if (stackTtl) {
            const [error, ttl] = stackTtl as [Error | null, number];
            if (!error && (ttl === -2 || ttl === -1)) {
              expiredKeys.push(`${this.CACHE_KEYS.STACKS}:${hostId}`);
            }
          }
        });

        if (expiredKeys.length > 0) {
          await this._redis.del(...expiredKeys);
          LoggingManager.getInstance().info('Cleaned up expired docker data', {
            count: expiredKeys.length
          } satisfies LogMetadata);
        }
      }
    );
  }

  private validateKey(hostId: string): void {
    validateKey(hostId, 'Invalid host ID');
  }

  private serialize<T extends Record<string, unknown>>(data: T): string {
    return serialize(data);
  }

  private deserialize<T extends Record<string, unknown>>(data: string): T {
    return deserialize<T>(data);
  }

  private getErrorMessage(error: unknown): string {
    return getErrorMessage(error);
  }

  private getErrorCode(error: unknown): RedisErrorCode {
    return getErrorCode(error);
  }

  private wrapError(error: unknown, message: string, metadata?: Record<string, unknown>): RedisError {
    return wrapError(error, message, metadata);
  }
}

