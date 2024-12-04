import { z } from 'zod';
import { BaseService } from '../services/base.service';
import { ConfigManager } from './ConfigManager';
import { LoggingManager } from './LoggingManager';
import { MetricsManager } from './MetricsManager';
import Redis from 'ioredis';
import { EventEmitter } from 'events';

// Zod Schemas for Configuration and Validation
const StateOptionsSchema = z.object({
  ttl: z.number().optional().default(0),
  persistent: z.boolean().optional().default(false),
  namespace: z.string().optional().default('default')
}).strict();

const StateEntrySchema = z.object({
  value: z.any(),
  timestamp: z.number(),
  ttl: z.number().optional(),
  persistent: z.boolean(),
  namespace: z.string().default('default')
}).strict();

export class StateManager extends BaseService {
  private static instance: StateManager;
  private redis: Redis;
  private memoryStore: Map<string, z.infer<typeof StateEntrySchema>>;
  private eventEmitter: EventEmitter;
  private cleanupInterval?: NodeJS.Timer;
  private configManager: ConfigManager;

  private constructor(
    configManager: ConfigManager,
    private logger: LoggingManager,
    private metrics: MetricsManager
  ) {
    super({
      name: 'state-manager',
      version: '1.0.0'
    });

    this.configManager = configManager;
    this.memoryStore = new Map();
    this.eventEmitter = new EventEmitter();
    
    // Initialize Redis with configuration from ConfigManager
    const redisConfig = this.configManager.get('redis', {
      url: 'redis://localhost:6379',
      retryAttempts: 3,
      retryDelay: 1000
    });

    this.redis = new Redis(redisConfig.url, {
      retryStrategy: (times: number) => {
        return times <= redisConfig.retryAttempts 
          ? times * redisConfig.retryDelay 
          : null;
      }
    });

    this.setupMetrics();
    this.setupErrorHandling();
  }

  public static getInstance(
    configManager: ConfigManager, 
    logger: LoggingManager, 
    metrics: MetricsManager
  ): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager(
        configManager, 
        logger, 
        metrics
      );
    }
    return StateManager.instance;
  }

  private setupErrorHandling(): void {
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled Rejection in StateManager', { 
        reason, 
        promise 
      });
    });

    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught Exception in StateManager', { error });
      this.metrics.incrementCounter('state_uncaught_exceptions_total');
    });
  }

  public async init(): Promise<void> {
    try {
      await this.redis.ping();
      this.startCleanupInterval();
      this.setupRedisSubscriptions();
      this.logger.info('StateManager initialized successfully');
    } catch (error) {
      this.logger.error('StateManager initialization failed', { error });
      throw error;
    }
  }

  public async cleanup(): Promise<void> {
    try {
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }
      await this.redis.quit();
      this.memoryStore.clear();
      this.eventEmitter.removeAllListeners();
    } catch (error) {
      this.logger.error('StateManager cleanup failed', { error });
      throw error;
    }
  }

  public async getHealth(): Promise<{ 
    status: 'healthy' | 'unhealthy' | 'degraded'; 
    details?: Record<string, unknown>; 
  }> {
    try {
      await this.redis.ping();
      return {
        status: 'healthy',
        details: {
          memoryStoreSize: this.memoryStore.size,
          redisConnected: this.redis.status === 'ready'
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          redisConnected: false
        }
      };
    }
  }

  private setupMetrics(): void {
    this.metrics.createGauge('state_items_total', 'Total number of state items', ['store', 'namespace']);
    this.metrics.createCounter('state_operations_total', 'Total number of state operations', ['operation', 'store', 'namespace']);
    this.metrics.createGauge('state_memory_usage_bytes', 'Memory usage of state store');
    this.metrics.createCounter('state_expired_items_total', 'Total number of expired items', ['store', 'namespace']);
    this.metrics.createCounter('state_uncaught_exceptions_total', 'Total number of uncaught exceptions');
  }

  private startCleanupInterval(): void {
    const CLEANUP_INTERVAL = this.configManager.get('stateManager.cleanupInterval', 60000);

    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupExpiredEntries();
      } catch (error) {
        this.logger.error('State cleanup error', { error });
      }
    }, CLEANUP_INTERVAL);
  }

  private setupRedisSubscriptions(): void {
    this.redis.on('error', (error) => {
      this.logger.error('Redis error', { error });
      this.metrics.incrementCounter('state_redis_errors_total');
    });

    this.redis.on('connect', () => {
      this.logger.info('Connected to Redis');
    });
  }

  private async cleanupExpiredEntries(): Promise<void> {
    const now = Date.now();
    const namespaceMetrics: Record<string, number> = {};

    for (const [key, entry] of this.memoryStore.entries()) {
      if (entry.ttl && now - entry.timestamp > entry.ttl) {
        this.memoryStore.delete(key);
        
        // Track metrics per namespace
        namespaceMetrics[entry.namespace] = 
          (namespaceMetrics[entry.namespace] || 0) + 1;
        
        this.eventEmitter.emit('stateExpired', { 
          key, 
          store: 'memory', 
          namespace: entry.namespace 
        });
      }
    }

    // Update metrics for each namespace
    Object.entries(namespaceMetrics).forEach(([namespace, count]) => {
      this.metrics.incrementCounter('state_expired_items_total', { 
        store: 'memory', 
        namespace 
      }, count);
    });

    this.metrics.setGauge('state_items_total', this.memoryStore.size, { 
      store: 'memory',
      namespace: 'default' 
    });
    this.metrics.setGauge('state_memory_usage_bytes', process.memoryUsage().heapUsed);
  }

  public async get<T>(key: string, namespace: string = 'default'): Promise<T | null> {
    try {
      const fullKey = `${namespace}:${key}`;
      
      // Memory store lookup
      const memoryEntry = this.memoryStore.get(fullKey);
      if (memoryEntry && (!memoryEntry.ttl || Date.now() - memoryEntry.timestamp <= memoryEntry.ttl)) {
        this.metrics.incrementCounter('state_operations_total', { 
          operation: 'get', 
          store: 'memory',
          namespace 
        });
        return memoryEntry.value;
      }

      // Redis lookup for persistent data
      const redisValue = await this.redis.get(fullKey);
      if (redisValue) {
        this.metrics.incrementCounter('state_operations_total', { 
          operation: 'get', 
          store: 'redis',
          namespace 
        });
        return JSON.parse(redisValue);
      }

      return null;
    } catch (error) {
      this.logger.error('State retrieval error', { error, key, namespace });
      throw error;
    }
  }

  public async set<T>(
    key: string, 
    value: T, 
    options: z.infer<typeof StateOptionsSchema> = {}
  ): Promise<void> {
    try {
      // Validate options
      const validatedOptions = StateOptionsSchema.parse(options);
      const namespace = validatedOptions.namespace || 'default';
      const fullKey = `${namespace}:${key}`;

      const entry = {
        value,
        timestamp: Date.now(),
        ttl: validatedOptions.ttl,
        persistent: validatedOptions.persistent || false,
        namespace
      };

      // Store in memory
      this.memoryStore.set(fullKey, entry);

      // Optionally store in Redis for persistence
      if (entry.persistent) {
        await this.redis.set(
          fullKey, 
          JSON.stringify(value), 
          'PX', 
          entry.ttl || 0
        );
      }

      // Update metrics
      this.metrics.incrementCounter('state_operations_total', { 
        operation: 'set', 
        store: entry.persistent ? 'redis' : 'memory',
        namespace 
      });

      // Emit event
      this.eventEmitter.emit('stateSet', { 
        key, 
        value, 
        namespace,
        persistent: entry.persistent 
      });
    } catch (error) {
      this.logger.error('State storage error', { error, key, namespace });
      throw error;
    }
  }

  // Event subscription methods
  public on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  public off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }
}
