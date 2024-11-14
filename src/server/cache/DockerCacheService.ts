import type { Container, Stack } from '../../types/models-shared';
import { BaseRedisService } from './BaseRedisService';

export class DockerCacheService extends BaseRedisService {
  private readonly CACHE_KEYS = {
    CONTAINERS: 'docker:containers',
    STACKS: 'docker:stacks',
  };

  private readonly CACHE_TTL = {
    CONTAINERS: 300, // 5 minutes
    STACKS: 300, // 5 minutes
  };

  // Container Management
  public async getContainers(hostId: string): Promise<Container[] | null> {
    try {
      this.checkConnection();
      const data = await this._redis.get(`${this.CACHE_KEYS.CONTAINERS}:${hostId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.handleError(error, 'get containers', { hostId });
    }
  }

  public async setContainers(hostId: string, containers: Container[]): Promise<void> {
    try {
      this.checkConnection();
      await this._redis.set(
        `${this.CACHE_KEYS.CONTAINERS}:${hostId}`,
        JSON.stringify(containers),
        'EX',
        this.CACHE_TTL.CONTAINERS
      );
    } catch (error) {
      this.handleError(error, 'set containers', { hostId });
    }
  }

  public async removeContainers(hostId: string): Promise<void> {
    try {
      this.checkConnection();
      await this._redis.del(`${this.CACHE_KEYS.CONTAINERS}:${hostId}`);
    } catch (error) {
      this.handleError(error, 'remove containers', { hostId });
    }
  }

  // Stack Management
  public async getStacks(hostId: string): Promise<Stack[] | null> {
    try {
      this.checkConnection();
      const data = await this._redis.get(`${this.CACHE_KEYS.STACKS}:${hostId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.handleError(error, 'get stacks', { hostId });
    }
  }

  public async setStacks(hostId: string, stacks: Stack[]): Promise<void> {
    try {
      this.checkConnection();
      await this._redis.set(
        `${this.CACHE_KEYS.STACKS}:${hostId}`,
        JSON.stringify(stacks),
        'EX',
        this.CACHE_TTL.STACKS
      );
    } catch (error) {
      this.handleError(error, 'set stacks', { hostId });
    }
  }

  public async removeStacks(hostId: string): Promise<void> {
    try {
      this.checkConnection();
      await this._redis.del(`${this.CACHE_KEYS.STACKS}:${hostId}`);
    } catch (error) {
      this.handleError(error, 'remove stacks', { hostId });
    }
  }
}
