import Redis from 'ioredis';
import { logger } from '../utils/logger';

export interface RedisMetrics {
  connectedClients: number;
  usedMemory: number;
  totalKeys: number;
  lastUpdate: Date;
}

export class RedisMetricsCollector {
  private _metrics: RedisMetrics = {
    connectedClients: 0,
    usedMemory: 0,
    totalKeys: 0,
    lastUpdate: new Date(),
  };

  private _interval?: NodeJS.Timeout;
  private readonly redis: Redis;
  private readonly intervalMs: number;

  constructor(redis: Redis, intervalMs: number = 5000) {
    this.redis = redis;
    this.intervalMs = intervalMs;
  }

  public getMetrics(): RedisMetrics {
    return { ...this._metrics };
  }

  public async start(): Promise<void> {
    if (this._interval) {
      return;
    }

    await this.collectMetrics();
    this._interval = setInterval(() => {
      void this.collectMetrics();
    }, this.intervalMs);
  }

  public stop(): void {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = undefined;
    }
  }

  private async collectMetrics(): Promise<void> {
    try {
      const info = await this.redis.info();
      const parsedInfo = this.parseRedisInfo(info);

      this._metrics = {
        connectedClients: Number(parsedInfo.connected_clients) || 0,
        usedMemory: Number(parsedInfo.used_memory) || 0,
        totalKeys: await this.getTotalKeys(),
        lastUpdate: new Date(),
      };
    } catch (error) {
      logger.error('Failed to collect Redis metrics:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async getTotalKeys(): Promise<number> {
    try {
      const keys = await this.redis.dbsize();
      return Number(keys);
    } catch (error) {
      logger.error('Failed to get total keys:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 0;
    }
  }

  private parseRedisInfo(info: string): Record<string, string> {
    const result: Record<string, string> = {};
    const lines = info.split('\n');

    for (const line of lines) {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          result[key.trim()] = value.trim();
        }
      }
    }

    return result;
  }
}
