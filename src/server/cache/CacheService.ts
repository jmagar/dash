import { 
  ICacheService, 
  ICacheBackend, 
  RedisCache, 
  LRUCacheBackend,
  CacheStrategy 
} from './types';
import { CacheConfig, CacheConfigSchema, defaultCacheConfig } from './config';
import { ConfigManager } from '../managers/ConfigManager';
import { LoggingManager } from '../managers/LoggingManager';
import { MetricsManager } from '../managers/MetricsManager';
import { 
  RedisConfig, 
  RedisConnectionConfig, 
  RedisErrorCode, 
  RedisError,
  RedisState,
  RedisResult 
} from '../../types/redis';

export class CacheService implements ICacheService {
  private strategy: CacheStrategy;
  private primaryCache: ICacheBackend;
  private fallbackCache?: ICacheBackend;
  private config: CacheConfig;
  private logger: LoggingManager;
  private metrics: MetricsManager;

  constructor(
    configManager: ConfigManager, 
    loggingManager: LoggingManager, 
    metricsManager: MetricsManager
  ) {
    this.logger = loggingManager;
    this.metrics = metricsManager;
    
    // Validate and get cache configuration
    const rawConfig = configManager.get('cache') || {};
    this.config = CacheConfigSchema.parse({...defaultCacheConfig, ...rawConfig});
    this.strategy = this.config.strategy;

    // Initialize primary and fallback caches
    this.primaryCache = this.initializePrimaryCache();
    this.fallbackCache = this.initializeFallbackCache();
  }

  private initializePrimaryCache(): ICacheBackend {
    switch (this.strategy) {
      case 'redis':
        return new RedisCache(this.config.redisConfig!);
      case 'hybrid':
        return new RedisCache(this.config.redisConfig!);
      default:
        return new LRUCacheBackend(this.config.maxSize);
    }
  }

  private initializeFallbackCache(): ICacheBackend | undefined {
    if (this.strategy === 'hybrid') {
      return new LRUCacheBackend(this.config.maxSize);
    }
    return undefined;
  }

  async set(key: string, value: unknown, options?: { ttl?: number }): Promise<RedisResult<void>> {
    const startTime = Date.now();
    try {
      // Set in primary cache
      const primaryResult = await this.primaryCache.set(key, value, { 
        ttl: options?.ttl || this.config.ttl 
      });

      // If hybrid strategy, also set in fallback cache
      let fallbackResult: RedisResult<void> | undefined;
      if (this.fallbackCache) {
        fallbackResult = await this.fallbackCache.set(key, value, { 
          ttl: options?.ttl || this.config.ttl 
        });
      }

      // Track metrics
      this.metrics.incrementCounter('cache_set_total');
      this.metrics.incrementHistogram('cache_set_duration', Date.now() - startTime);

      // Return primary result, with fallback error if exists
      return {
        success: primaryResult.success && (!fallbackResult || fallbackResult.success),
        error: fallbackResult?.error || primaryResult.error,
        metadata: {
          duration: Date.now() - startTime,
          retries: 0,
          timestamp: new Date()
        }
      };
    } catch (error) {
      const redisError = new RedisError({
        code: RedisErrorCode.OPERATION_ERROR,
        message: 'Cache set operation failed',
        cause: error
      });

      this.logger.error('Cache set failed', { key, error: redisError });
      this.metrics.incrementCounter('cache_set_errors');

      return {
        success: false,
        error: redisError,
        metadata: {
          duration: Date.now() - startTime,
          retries: 0,
          timestamp: new Date()
        }
      };
    }
  }

  async get<T = unknown>(key: string): Promise<RedisResult<T | null>> {
    const startTime = Date.now();
    try {
      // Try primary cache first
      const primaryResult = await this.primaryCache.get<T>(key);

      // If hybrid strategy and primary miss, try fallback
      let fallbackResult: RedisResult<T | null> | undefined;
      if (!primaryResult.success && this.fallbackCache) {
        fallbackResult = await this.fallbackCache.get<T>(key);
        
        // If found in fallback, update primary
        if (fallbackResult.success && fallbackResult.data !== null) {
          await this.primaryCache.set(key, fallbackResult.data);
        }
      }

      // Track metrics
      if (primaryResult.success || fallbackResult?.success) {
        this.metrics.incrementCounter('cache_hit_total');
      } else {
        this.metrics.incrementCounter('cache_miss_total');
      }
      
      this.metrics.incrementHistogram('cache_get_duration', Date.now() - startTime);
      
      // Return primary result, with fallback value if exists
      return {
        success: primaryResult.success || (fallbackResult?.success ?? false),
        data: fallbackResult?.data ?? primaryResult.data,
        error: fallbackResult?.error ?? primaryResult.error,
        metadata: {
          duration: Date.now() - startTime,
          retries: 0,
          timestamp: new Date()
        }
      };
    } catch (error) {
      const redisError = new RedisError({
        code: RedisErrorCode.OPERATION_ERROR,
        message: 'Cache get operation failed',
        cause: error
      });

      this.logger.error('Cache get failed', { key, error: redisError });
      this.metrics.incrementCounter('cache_get_errors');

      return {
        success: false,
        error: redisError,
        metadata: {
          duration: Date.now() - startTime,
          retries: 0,
          timestamp: new Date()
        }
      };
    }
  }

  async delete(key: string): Promise<RedisResult<void>> {
    const startTime = Date.now();
    try {
      // Delete from primary cache
      const primaryResult = await this.primaryCache.delete(key);

      // If hybrid strategy, also delete from fallback cache
      let fallbackResult: RedisResult<void> | undefined;
      if (this.fallbackCache) {
        fallbackResult = await this.fallbackCache.delete(key);
      }

      // Track metrics
      this.metrics.incrementCounter('cache_delete_total');
      this.metrics.incrementHistogram('cache_delete_duration', Date.now() - startTime);

      // Return primary result, with fallback error if exists
      return {
        success: primaryResult.success && (!fallbackResult || fallbackResult.success),
        error: fallbackResult?.error || primaryResult.error,
        metadata: {
          duration: Date.now() - startTime,
          retries: 0,
          timestamp: new Date()
        }
      };
    } catch (error) {
      const redisError = new RedisError({
        code: RedisErrorCode.OPERATION_ERROR,
        message: 'Cache delete operation failed',
        cause: error
      });

      this.logger.error('Cache delete failed', { key, error: redisError });
      this.metrics.incrementCounter('cache_delete_errors');

      return {
        success: false,
        error: redisError,
        metadata: {
          duration: Date.now() - startTime,
          retries: 0,
          timestamp: new Date()
        }
      };
    }
  }

  async clear(): Promise<RedisResult<void>> {
    const startTime = Date.now();
    try {
      // Clear primary cache
      const primaryResult = await this.primaryCache.clear();

      // If hybrid strategy, also clear fallback cache
      let fallbackResult: RedisResult<void> | undefined;
      if (this.fallbackCache) {
        fallbackResult = await this.fallbackCache.clear();
      }

      // Track metrics
      this.metrics.incrementCounter('cache_clear_total');
      this.metrics.incrementHistogram('cache_clear_duration', Date.now() - startTime);

      // Return primary result, with fallback error if exists
      return {
        success: primaryResult.success && (!fallbackResult || fallbackResult.success),
        error: fallbackResult?.error || primaryResult.error,
        metadata: {
          duration: Date.now() - startTime,
          retries: 0,
          timestamp: new Date()
        }
      };
    } catch (error) {
      const redisError = new RedisError({
        code: RedisErrorCode.OPERATION_ERROR,
        message: 'Cache clear operation failed',
        cause: error
      });

      this.logger.error('Cache clear failed', { error: redisError });
      this.metrics.incrementCounter('cache_clear_errors');

      return {
        success: false,
        error: redisError,
        metadata: {
          duration: Date.now() - startTime,
          retries: 0,
          timestamp: new Date()
        }
      };
    }
  }

  async health(): Promise<{
    status: RedisState;
    strategies: {
      redis?: { connected: boolean };
      lru?: { size: number; maxSize: number };
    };
  }> {
    try {
      const primaryHealth = await this.primaryCache.health();
      const fallbackHealth = this.fallbackCache ? await this.fallbackCache.health() : undefined;

      const status: RedisState = 
        (!primaryHealth.connected) ? RedisState.DISCONNECTED :
        (fallbackHealth && !fallbackHealth.connected) ? RedisState.CONNECTING : 
        RedisState.CONNECTED;

      return {
        status,
        strategies: {
          redis: primaryHealth.connected ? { connected: true } : undefined,
          lru: fallbackHealth?.connected ? { 
            size: this.fallbackCache instanceof LRUCacheBackend ? this.fallbackCache['cache'].size : 0, 
            maxSize: this.config.maxSize 
          } : undefined
        }
      };
    } catch (error) {
      const redisError = new RedisError({
        code: RedisErrorCode.OPERATION_ERROR,
        message: 'Cache health check failed',
        cause: error
      });

      this.logger.error('Cache health check failed', { error: redisError });

      return {
        status: RedisState.DISCONNECTED,
        strategies: {}
      };
    }
  }
}
