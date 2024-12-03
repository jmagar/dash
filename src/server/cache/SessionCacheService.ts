import { RedisConfig } from '../../types/redis';
import { BaseCacheService } from './BaseCacheService';
import type { SessionData } from '../../types/session';

/**
 * Service for caching session data in Redis
 */
export class SessionCacheService extends BaseCacheService {
  protected readonly CACHE_KEY = 'session';
  protected readonly CACHE_TTL = 3600; // 1 hour

  constructor(config: RedisConfig) {
    super(config);
  }

  /**
   * Stores session data
   */
  public async set(token: string, data: SessionData): Promise<void> {
    return super.set(token, data, { token: this.maskToken(token) });
  }

  /**
   * Retrieves session data
   */
  public async get(token: string): Promise<SessionData | null> {
    return super.get<SessionData>(token, { token: this.maskToken(token) });
  }

  /**
   * Removes session data
   */
  public async delete(token: string): Promise<void> {
    return super.delete(token, { token: this.maskToken(token) });
  }

  /**
   * Cleans up expired sessions
   */
  public async cleanup(): Promise<void> {
    return this.cleanupExpired();
  }

  /**
   * Mask token for logging
   */
  private maskToken(token: string): string {
    return this.maskSensitiveData(token);
  }
}
