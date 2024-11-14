import type { User } from '../../types/auth';
import { BaseRedisService } from './BaseRedisService';

export class SessionCacheService extends BaseRedisService {
  private readonly CACHE_KEY = 'session';
  private readonly CACHE_TTL = 3600; // 1 hour

  public async getSession(token: string): Promise<string | null> {
    try {
      this.checkConnection();
      return await this._redis.get(`${this.CACHE_KEY}:${token}`);
    } catch (error) {
      this.handleError(error, 'get session');
    }
  }

  public async setSession(token: string, user: User, refreshToken: string): Promise<void> {
    try {
      this.checkConnection();
      const sessionData = JSON.stringify({ user, refreshToken });
      await this._redis.set(
        `${this.CACHE_KEY}:${token}`,
        sessionData,
        'EX',
        this.CACHE_TTL
      );
    } catch (error) {
      this.handleError(error, 'set session');
    }
  }

  public async removeSession(token: string): Promise<void> {
    try {
      this.checkConnection();
      await this._redis.del(`${this.CACHE_KEY}:${token}`);
    } catch (error) {
      this.handleError(error, 'remove session');
    }
  }
}
