import { BaseRedisService } from './BaseRedisService';

export class CommandCacheService extends BaseRedisService {
  private readonly CACHE_KEY = 'command';
  private readonly CACHE_TTL = 86400; // 24 hours

  public async getCommand(id: string): Promise<string | null> {
    try {
      this.checkConnection();
      return await this._redis.get(`${this.CACHE_KEY}:${id}`);
    } catch (error) {
      this.handleError(error, 'get command');
    }
  }

  public async setCommand(id: string, data: string): Promise<void> {
    try {
      this.checkConnection();
      await this._redis.set(
        `${this.CACHE_KEY}:${id}`,
        data,
        'EX',
        this.CACHE_TTL
      );
    } catch (error) {
      this.handleError(error, 'set command');
    }
  }

  public async removeCommand(id: string): Promise<void> {
    try {
      this.checkConnection();
      await this._redis.del(`${this.CACHE_KEY}:${id}`);
    } catch (error) {
      this.handleError(error, 'remove command');
    }
  }
}
