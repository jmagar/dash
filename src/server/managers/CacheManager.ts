import { Redis, RedisOptions } from 'ioredis';
import { z } from 'zod';
import { BaseService } from './base/BaseService';
import { ConfigManager } from './ConfigManager';
import { MetricsManager } from './MetricsManager';
import { LoggingManager } from './LoggingManager';
import { ServiceHealth, ServiceStatus } from './base/types';

// Enhanced Zod Schemas
const RedisCacheConfigSchema = z.object({
  host: z.string().default('localhost'),
  port: z.number().int().min(1).max(65535).default(6379),
  password: z.string().optional(),
  db: z.number().int().min(0).max(15).default(0),
  keyPrefix: z.string().default('dash:'),
  connectTimeout: z.number().int().min(1000).max(30000).default(10000),
  maxRetriesPerRequest: z.number().int().min(0).max(10).default(3),
  enableReadyCheck: z.boolean().default(true),
  enableOfflineQueue: z.boolean().default(true)
}).strict();

const CacheDefaultsSchema = z.object({
  ttl: z.number().int().min(0).max(86400).default(3600),
  maxKeys: z.number().int().min(100).max(1000000).default(10000),
  compressionThreshold: z.number().int().min(0).max(1024 * 1024).default(1024)
}).strict();

const CacheMonitoringSchema = z.object({
  enabled: z.boolean().default(true),
  interval: z.number().int().min(5000).max(3600000).default(60000)
}).strict();

const CacheConfigSchema = z.object({
  redis: RedisCacheConfigSchema,
  defaults: CacheDefaultsSchema,
  monitoring: CacheMonitoringSchema
}).strict();

type CacheConfig = z.infer<typeof CacheConfigSchema>;

export class CacheManager extends BaseService {
  private static instance: CacheManager;
  private client: Redis | null = null;
  private config: CacheConfig;

  private constructor(
    private configManager: ConfigManager,
    private logger: LoggingManager,
    private metrics: MetricsManager
  ) {
    super({
      name: 'CacheManager',
      version: '1.0.0',
      dependencies: ['ConfigManager', 'MetricsManager', 'LoggingManager']
    });
  }

  public static getInstance(
    configManager: ConfigManager,
    logger: LoggingManager,
    metrics: MetricsManager
  ): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager(
        configManager, 
        logger, 
        metrics
      );
    }
    return CacheManager.instance;
  }

  private setupErrorHandling(): void {
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled Rejection in CacheManager', { 
        reason, 
        promise 
      });
      this.metrics.incrementCounter('cache_unhandled_rejections_total');
    });

    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught Exception in CacheManager', { error });
      this.metrics.incrementCounter('cache_uncaught_exceptions_total');
    });
  }

  async init(): Promise<void> {
    try {
      // Initialize metrics
      this.initializeMetrics();
      this.setupErrorHandling();

      // Load and validate config
      const rawConfig = this.configManager.get('cache', {});
      this.config = CacheConfigSchema.parse({
        redis: {
          host: process.env.REDIS_HOST,
          port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : undefined,
          password: process.env.REDIS_PASSWORD,
          db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : undefined
        },
        ...rawConfig
      });

      // Initialize Redis client
      await this.initializeRedis();

      // Start monitoring if enabled
      if (this.config.monitoring.enabled) {
        this.startMonitoring();
      }

      this.logger.info('CacheManager initialized successfully', {
        redis: {
          host: this.config.redis.host,
          port: this.config.redis.port,
          db: this.config.redis.db
        }
      });
    } catch (error) {
      this.logger.error('Failed to initialize CacheManager', { error });
      throw error;
    }
  }

  public async cleanup(): Promise<void> {
    try {
      if (this.client) {
        await this.client.quit();
        this.client = null;
      }
      this.logger.info('CacheManager cleaned up successfully');
    } catch (error) {
      this.logger.error('Error during CacheManager cleanup', { error });
      throw error;
    }
  }

  public async getHealth(): Promise<{ 
    status: 'healthy' | 'unhealthy' | 'degraded'; 
    details?: Record<string, unknown>; 
  }> {
    try {
      if (!this.client) {
        return {
          status: 'unhealthy',
          details: { connection: false }
        };
      }

      const startTime = Date.now();
      await this.client.ping();
      const pingTime = Date.now() - startTime;

      return {
        status: pingTime > 1000 ? 'degraded' : 'healthy',
        details: {
          connection: true,
          pingTime,
          config: {
            host: this.config.redis.host.replace(/\/\/.*:.*@/, '//[REDACTED]@'),
            port: this.config.redis.port
          }
        }
      };
    } catch (error) {
      this.logger.error('Cache health check failed', { error });
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          connection: false
        }
      };
    }
  }

  private initializeMetrics(): void {
    this.metrics.createCounter('cache_operations_total', 'Total number of cache operations', ['operation']);
    this.metrics.createCounter('cache_hits_total', 'Total number of cache hits');
    this.metrics.createCounter('cache_misses_total', 'Total number of cache misses');
    this.metrics.createCounter('cache_errors_total', 'Total number of cache errors', ['type']);
    this.metrics.createGauge('cache_keys_total', 'Total number of cache keys');
    this.metrics.createGauge('cache_memory_bytes', 'Memory used by cache in bytes');
    this.metrics.createHistogram('cache_operation_duration_seconds', 'Duration of cache operations');
    this.metrics.createCounter('cache_unhandled_rejections_total', 'Total unhandled rejections');
    this.metrics.createCounter('cache_uncaught_exceptions_total', 'Total uncaught exceptions');
  }

  private async initializeRedis(): Promise<void> {
    const options: RedisOptions = {
      host: this.config.redis.host,
      port: this.config.redis.port,
      password: this.config.redis.password,
      db: this.config.redis.db,
      keyPrefix: this.config.redis.keyPrefix,
      connectTimeout: this.config.redis.connectTimeout,
      maxRetriesPerRequest: this.config.redis.maxRetriesPerRequest,
      enableReadyCheck: this.config.redis.enableReadyCheck,
      enableOfflineQueue: this.config.redis.enableOfflineQueue,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    };

    this.client = new Redis(options);

    this.client.on('error', (error) => {
      this.logger.error('Redis client error', { error });
      this.metrics.incrementCounter('cache_errors_total', { type: 'connection' });
    });

    this.client.on('ready', () => {
      this.logger.info('Redis client ready');
    });

    await this.client.ping();
  }

  private startMonitoring(): void {
    const interval = this.config.monitoring.interval;
    
    const monitor = async () => {
      try {
        if (!this.client) return;

        const info = await this.client.info();
        const memory = this.parseRedisInfo(info, 'used_memory');
        const keys = await this.client.dbsize();

        this.metrics.setGauge('cache_keys_total', keys);
        this.metrics.setGauge('cache_memory_bytes', parseInt(memory));
      } catch (error) {
        this.logger.error('Cache monitoring error', { error });
        this.metrics.incrementCounter('cache_errors_total', { type: 'monitoring' });
      }
    };

    // Initial monitoring
    monitor();

    // Periodic monitoring
    setInterval(monitor, interval);
  }

  private parseRedisInfo(info: string, key: string): string {
    const lines = info.split('\n');
    const line = lines.find(l => l.startsWith(`${key}:`));
    return line ? line.split(':')[1].trim() : '0';
  }

  // Wrapper methods with metrics and logging
  public async set(key: string, value: any, ttl?: number): Promise<void> {
    const startTime = Date.now();
    try {
      if (!this.client) throw new Error('Redis client not initialized');
      
      const effectiveTtl = ttl || this.config.defaults.ttl;
      await this.client.set(key, JSON.stringify(value), 'EX', effectiveTtl);
      
      this.metrics.incrementCounter('cache_operations_total', { operation: 'set' });
      this.metrics.observeHistogram('cache_operation_duration_seconds', (Date.now() - startTime) / 1000);
    } catch (error) {
      this.logger.error('Cache set error', { key, error });
      this.metrics.incrementCounter('cache_errors_total', { type: 'set' });
      throw error;
    }
  }

  public async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    try {
      if (!this.client) throw new Error('Redis client not initialized');
      
      const value = await this.client.get(key);
      
      if (value) {
        this.metrics.incrementCounter('cache_hits_total');
        this.metrics.observeHistogram('cache_operation_duration_seconds', (Date.now() - startTime) / 1000);
        return JSON.parse(value) as T;
      }
      
      this.metrics.incrementCounter('cache_misses_total');
      return null;
    } catch (error) {
      this.logger.error('Cache get error', { key, error });
      this.metrics.incrementCounter('cache_errors_total', { type: 'get' });
      throw error;
    }
  }

  public async delete(key: string): Promise<void> {
    const startTime = Date.now();
    try {
      if (!this.client) throw new Error('Redis client not initialized');
      
      await this.client.del(key);
      
      this.metrics.incrementCounter('cache_operations_total', { operation: 'delete' });
      this.metrics.observeHistogram('cache_operation_duration_seconds', (Date.now() - startTime) / 1000);
    } catch (error) {
      this.logger.error('Cache delete error', { key, error });
      this.metrics.incrementCounter('cache_errors_total', { type: 'delete' });
      throw error;
    }
  }

  public async exists(key: string): Promise<boolean> {
    const startTime = Date.now();
    try {
      if (!this.client) throw new Error('Redis client not initialized');
      return await this.client.exists(key) === 1;
    } catch (error) {
      this.logger.error('Cache exists error', { key, error });
      this.metrics.incrementCounter('cache_errors_total', { type: 'exists' });
      throw error;
    } finally {
      const [seconds, nanoseconds] = process.hrtime(startTime);
      this.metrics.observeHistogram('cache_operation_duration_seconds', seconds + nanoseconds / 1e9);
      this.metrics.incrementCounter('cache_operations_total', { operation: 'exists' });
    }
  }

  public async clear(): Promise<void> {
    const startTime = Date.now();
    try {
      if (!this.client) throw new Error('Redis client not initialized');
      await this.client.flushdb();
      this.metrics.setGauge('cache_keys_total', 0);
    } catch (error) {
      this.logger.error('Cache clear error', { error });
      this.metrics.incrementCounter('cache_errors_total', { type: 'clear' });
      throw error;
    } finally {
      const [seconds, nanoseconds] = process.hrtime(startTime);
      this.metrics.observeHistogram('cache_operation_duration_seconds', seconds + nanoseconds / 1e9);
      this.metrics.incrementCounter('cache_operations_total', { operation: 'clear' });
    }
  }
}

export default CacheManager.getInstance();
