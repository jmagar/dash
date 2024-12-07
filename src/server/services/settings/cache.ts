import { RedisClientWrapper } from '../../cache/redis.client';
import type { JsonValue } from '../../managers/types/manager.types';
import type { CacheOptions } from './types';

export class SettingsCache {
  constructor(
    private readonly redis: RedisClientWrapper,
    private readonly defaultTTL: number = 3600
  ) {}

  public getCacheKey(userId: string, category?: string, subcategory?: string): string {
    const parts = ['settings', userId];
    if (category) {
      parts.push(category);
      if (subcategory) {
        parts.push(subcategory);
      }
    }
    return parts.join(':');
  }

  public async getFromCache<T extends JsonValue>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get<string>(key);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    } catch (error) {
      // Cache miss is not an error
      console.debug(`Cache miss for key: ${key}`);
    }
    return null;
  }

  public async setInCache<T extends JsonValue>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const ttl = options.ttl ?? this.defaultTTL;
    try {
      await this.redis.set(key, JSON.stringify(value), ttl);
    } catch (error) {
      console.warn(`Failed to set cache for key: ${key}`, error);
    }
  }

  public async removeFromCache(key: string): Promise<void> {
    try {
      await this.redis.delete(key);
    } catch (error) {
      console.warn(`Failed to remove cache for key: ${key}`, error);
    }
  }

  public async removeAllFromCache(pattern: string): Promise<void> {
    try {
      await this.redis.clear();
    } catch (error) {
      console.warn(`Failed to remove all from cache for pattern: ${pattern}`, error);
    }
  }
}
