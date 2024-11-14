import { BaseRedisService } from './BaseRedisService';

export class HostCacheService extends BaseRedisService {
  private readonly CACHE_KEY = 'host';
  private readonly CACHE_TTL = 300; // 5 minutes

  public async getHost(id: string): Promise<string | null> {
    try {
      this.checkConnection();
      return await this._redis.get(`${this.CACHE_KEY}:${id}`);
    } catch (error) {
      this.handleError(error, 'get host');
    }
  }

  public async setHost(id: string, data: string): Promise<void> {
    try {
      this.checkConnection();
      await this._redis.set(
        `${this.CACHE_KEY}:${id}`,
        data,
        'EX',
        this.CACHE_TTL
      );
    } catch (error) {
      this.handleError(error, 'set host');
    }
  }

  public async removeHost(id: string): Promise<void> {
    try {
      this.checkConnection();
      await this._redis.del(`${this.CACHE_KEY}:${id}`);
    } catch (error) {
      this.handleError(error, 'remove host');
    }
  }
}
