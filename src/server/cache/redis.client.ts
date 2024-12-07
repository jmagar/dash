import { EventEmitter } from 'events';
import IORedis, { Redis, RedisStatus } from 'ioredis';
import { LoggingManager } from '../managers/LoggingManager';
import type { CacheKey, CacheValue, CacheStats, CacheHealth, CacheClient } from './types';
import type { RedisConnectionConfig } from '../../types/redis';
import { RedisError, RedisErrorCode, REDIS_ERROR_MESSAGES } from '../../types/redis';

export interface RedisConfig {
  url: string;
  maxRetries?: number;
  connectTimeout?: number;
  keyPrefix?: string;
}

interface RedisClientEvents {
  connect: () => void;
  ready: () => void;
  error: (err: Error) => void;
  close: () => void;
  reconnecting: (params: { attempt: number; delay: number }) => void;
  end: () => void;
}

interface RedisClientType extends Redis {
  status: RedisStatus;
  set(key: string, value: string, mode?: string, duration?: number): Promise<'OK'>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<number>;
  flushall(): Promise<'OK'>;
  ping(): Promise<string>;
  info(section: string): Promise<string>;
  dbsize(): Promise<number>;
  quit(): Promise<'OK'>;
}

export class RedisClientWrapper extends EventEmitter implements CacheClient {
  private client: RedisClientType;
  private logger: LoggingManager;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    keys: 0,
    size: 0
  };

  constructor(config: RedisConfig) {
    super();
    this.logger = LoggingManager.getInstance();

    const [host, port] = config.url.split(':');
    const connectionConfig: RedisConnectionConfig = {
      host: host || 'localhost',
      port: parseInt(port || '6379', 10),
      maxRetriesPerRequest: config.maxRetries ?? 3,
      enableReadyCheck: true,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    };

    this.client = new IORedis(connectionConfig) as RedisClientType;
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    type RedisEventName = keyof RedisClientEvents;
    const events: RedisEventName[] = ['connect', 'ready', 'error', 'close', 'reconnecting', 'end']

    events.forEach(event => {
      const clientEmitter = this.client as unknown as EventEmitter;
      clientEmitter.on(event, (...args: unknown[]) => {
        switch (event) {
          case 'connect':
            this.logger.info('Redis client connected');
            this.emit('state:change', 'connected');
            break;
          case 'ready':
            this.logger.info('Redis client ready');
            this.emit('state:change', 'ready');
            break;
          case 'error':
            this.handleError(args[0] as Error);
            break;
          case 'close':
            this.logger.info('Redis client closed');
            this.emit('state:change', 'disconnected');
            break;
          case 'reconnecting':
            this.handleReconnecting(args[0] as { attempt: number; delay: number });
            break;
          case 'end':
            this.logger.info('Redis client ended');
            this.emit('state:change', 'disconnected');
            break;
        }
      });
    });
  }

  private handleError(error: Error): void {
    this.logger.error('Redis client error', {
      error: error.message,
      stack: error.stack
    });
    this.emit('error', error);
    this.emit('state:change', 'error');
  }

  private handleReconnecting(params: { attempt: number; delay: number }): void {
    this.logger.warn('Redis client reconnecting', params);
    this.emit('state:change', 'reconnecting');
  }

  async set(key: CacheKey, value: CacheValue, ttl?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      if (ttl) {
        await this.client.set(key, serializedValue, 'EX', ttl);
      } else {
        await this.client.set(key, serializedValue);
      }
      this.stats.keys++;
      this.stats.size = await this.getSize();
    } catch (error) {
      throw new RedisError({
        code: RedisErrorCode.OPERATION_ERROR,
        message: REDIS_ERROR_MESSAGES[RedisErrorCode.OPERATION_ERROR],
        cause: error,
        metadata: {
          operation: 'set',
          key,
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  async get<T extends CacheValue>(key: CacheKey): Promise<T | undefined> {
    try {
      const value = await this.client.get(key);
      if (value) {
        this.stats.hits++;
        this.stats.lastAccess = new Date();
        return JSON.parse(value) as T;
      } else {
        this.stats.misses++;
        return undefined;
      }
    } catch (error) {
      throw new RedisError({
        code: RedisErrorCode.OPERATION_ERROR,
        message: REDIS_ERROR_MESSAGES[RedisErrorCode.OPERATION_ERROR],
        cause: error,
        metadata: {
          operation: 'get',
          key,
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  async delete(key: CacheKey): Promise<void> {
    try {
      await this.client.del(key);
      this.stats.keys--;
      this.stats.size = await this.getSize();
    } catch (error) {
      throw new RedisError({
        code: RedisErrorCode.OPERATION_ERROR,
        message: REDIS_ERROR_MESSAGES[RedisErrorCode.OPERATION_ERROR],
        cause: error,
        metadata: {
          operation: 'delete',
          key,
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  async clear(): Promise<void> {
    try {
      await this.client.flushall();
      this.stats = {
        hits: 0,
        misses: 0,
        keys: 0,
        size: 0
      };
    } catch (error) {
      throw new RedisError({
        code: RedisErrorCode.OPERATION_ERROR,
        message: REDIS_ERROR_MESSAGES[RedisErrorCode.OPERATION_ERROR],
        cause: error,
        metadata: {
          operation: 'clear',
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  getStats(): CacheStats {
    return this.stats;
  }

  async healthCheck(): Promise<CacheHealth> {
    try {
      const startTime = Date.now();
      await this.client.ping();
      const pingTime = Date.now() - startTime;

      const memoryInfo = await this.client.info('memory');
      const usedMemoryMatch = /used_memory:(\d+)/.exec(memoryInfo);
      const usedMemory = usedMemoryMatch ? Number(usedMemoryMatch[1]) : undefined;

      const size = await this.getSize();
      const isConnected = this.client.status === 'ready';

      return {
        status: isConnected 
          ? (pingTime > 100 ? 'degraded' : 'healthy')
          : 'error',
        details: {
          size,
          stats: this.stats,
          redis: {
            connected: isConnected,
            usedMemory,
            lastPing: pingTime
          }
        }
      };
    } catch (error) {
      this.logger.error('Health check failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      return {
        status: 'error',
        details: {
          size: 0,
          stats: this.stats,
          redis: {
            connected: false
          }
        }
      };
    }
  }

  async cleanup(): Promise<void> {
    try {
      await this.client.quit();
      this.removeAllListeners();
    } catch (error) {
      throw new RedisError({
        code: RedisErrorCode.OPERATION_ERROR,
        message: REDIS_ERROR_MESSAGES[RedisErrorCode.OPERATION_ERROR],
        cause: error,
        metadata: {
          operation: 'cleanup',
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  private async getSize(): Promise<number> {
    try {
      const size = await this.client.dbsize();
      return typeof size === 'number' ? size : 0;
    } catch (error) {
      throw new RedisError({
        code: RedisErrorCode.OPERATION_ERROR,
        message: REDIS_ERROR_MESSAGES[RedisErrorCode.OPERATION_ERROR],
        cause: error,
        metadata: {
          operation: 'getSize',
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }
}

export const redis = new RedisClientWrapper({
  url: process.env.REDIS_URL || 'localhost:6379'
});
