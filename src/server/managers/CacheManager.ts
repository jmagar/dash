import { BaseService } from '../services/base.service';
import { ConfigManager } from './ConfigManager';
import { LoggingManager } from './LoggingManager';
import { MetricsManager } from './MetricsManager';
import { BaseManagerDependencies } from './ManagerContainer';
import { RedisClientWrapper } from '../cache/redis.client';
import { CacheStats, CacheHealth } from '../cache/types';
import { JsonValue } from './types/manager.types';
import type { LogMetadata } from '../../types/logger';

const CACHE_SERVICE_CONFIG = {
  retryOptions: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 5000,
    factor: 2,
    timeout: 30000
  },
  cacheOptions: {
    ttl: 300,
    prefix: 'cache:'
  },
  metricsEnabled: true,
  loggingEnabled: true,
  validation: {
    strict: true
  }
};

export class CacheManager extends BaseService {
  private static instance: CacheManager;
  private configManager?: ConfigManager;
  private metricsManager?: MetricsManager;
  private redisClient?: RedisClientWrapper;
  protected readonly logger: LoggingManager;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    keys: 0,
    size: 0
  };

  private constructor() {
    super(CACHE_SERVICE_CONFIG);
    this.logger = LoggingManager.getInstance();
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  async initialize(deps: BaseManagerDependencies): Promise<void> {
    this.configManager = deps.configManager;
    this.metricsManager = deps.metricsManager;

    try {
      const client = this.initializeRedis();
      if (client) {
        // Wait for Redis client to be ready
        await client.healthCheck();
        this.redisClient = client;
      }
      this.initializeMetrics();
      this.logger.info('CacheManager initialized successfully');
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      };
      this.logger.error('Failed to initialize CacheManager', metadata);
      throw error;
    }
  }

  private initializeRedis(): RedisClientWrapper | undefined {
    if (!this.configManager) {
      throw new Error('ConfigManager is required but not initialized');
    }

    const redisConfig = this.configManager.get<{
      url: string;
      maxRetries?: number;
      connectTimeout?: number;
      keyPrefix?: string;
    }>('redis');

    if (!redisConfig?.data?.url) {
      throw new Error('Redis URL is required');
    }

    return new RedisClientWrapper({
      url: redisConfig.data.url,
      maxRetries: redisConfig.data.maxRetries,
      connectTimeout: redisConfig.data.connectTimeout,
      keyPrefix: redisConfig.data.keyPrefix
    });
  }

  private initializeMetrics(): void {
    if (!this.metricsManager) {
      this.logger.warn('MetricsManager not available, skipping metrics initialization');
      return;
    }

    try {
      this.metricsManager.createCounter('cache_hits_total', 'Total number of cache hits');
      this.metricsManager.createCounter('cache_misses_total', 'Total number of cache misses');
      this.metricsManager.createGauge('cache_size', 'Current number of items in cache');
      this.metricsManager.createHistogram(
        'cache_operation_duration_seconds',
        'Duration of cache operations',
        ['operation']
      );

      this.logger.info('Cache metrics initialized');
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      };
      this.logger.error('Failed to initialize cache metrics', metadata);
    }
  }

  async set(key: string, value: JsonValue, ttl?: number): Promise<void> {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }
    await this.redisClient.set(key, value, ttl);
  }

  async get<T extends JsonValue>(key: string): Promise<T | undefined> {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }
    return this.redisClient.get<T>(key);
  }

  async delete(key: string): Promise<void> {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }
    await this.redisClient.delete(key);
  }

  async clear(): Promise<void> {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }
    await this.redisClient.clear();
  }

  getStats(): CacheStats {
    if (!this.redisClient) {
      return this.stats;
    }
    return this.redisClient.getStats();
  }

  async healthCheck(): Promise<CacheHealth> {
    if (!this.redisClient) {
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
    return this.redisClient.healthCheck();
  }

  async cleanup(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.cleanup();
    }
    await super.cleanup();
  }
}
