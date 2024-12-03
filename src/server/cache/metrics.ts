import Redis from 'ioredis';
import { LoggingManager } from '../utils/logging/LoggingManager';
import { RedisError, RedisErrorCode } from '../../types/redis';
import { getErrorMessage, wrapError } from './utils/error';

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
      const info = await this.redisLoggingManager.getInstance().();
      const parsedInfo = this.parseRedisInfo(info);

      this._metrics = {
        connectedClients: Number(parsedInfo.connected_clients) || 0,
        usedMemory: Number(parsedInfo.used_memory) || 0,
        totalKeys: await this.getTotalKeys(),
        lastUpdate: new Date(),
      };
    } catch (error) {
      const redisError = wrapError(error, 'Failed to collect Redis metrics', {
        service: this.constructor.name,
        operation: 'collectMetrics',
        interval: this.intervalMs,
      });
      LoggingManager.getInstance().error('Failed to collect Redis metrics:', { error: redisError.toJSON() });
    }
  }

  private async getTotalKeys(): Promise<number> {
    try {
      const keys = await this.redis.dbsize();
      return Number(keys);
    } catch (error) {
      const redisError = wrapError(error, 'Failed to get total keys', {
        service: this.constructor.name,
        operation: 'getTotalKeys',
      });
      LoggingManager.getInstance().error('Failed to get total keys:', { error: redisError.toJSON() });
      return 0;
    }
  }

  private parseRedisInfo(info: string): Record<string, string> {
    try {
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
    } catch (error) {
      throw wrapError(error, 'Failed to parse Redis INFO command output', {
        service: this.constructor.name,
        operation: 'parseRedisInfo',
      });
    }
  }
}


