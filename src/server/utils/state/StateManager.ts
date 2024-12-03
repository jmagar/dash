import { Redis } from 'ioredis';
import { z } from 'zod';
import { LoggingManager } from '../logging/LoggingManager';
import { MetricsManager } from '../metrics/MetricsManager';

export interface StateOptions {
  ttl?: number;
  namespace?: string;
}

export type StateListener<T> = (state: T) => void;

export class StateManager {
  private static instance: StateManager;
  private redis: Redis;
  private metrics: MetricsManager;
  private listeners: Map<string, Set<StateListener<any>>>;
  private schemas: Map<string, z.ZodType>;

  private constructor(redisClient: Redis) {
    this.redis = redisClient;
    this.metrics = MetricsManager.getInstance();
    this.listeners = new Map();
    this.schemas = new Map();
    this.setupMetrics();
  }

  public static getInstance(redisClient?: Redis): StateManager {
    if (!StateManager.instance) {
      if (!redisClient) {
        throw new Error('Redis client required for initialization');
      }
      StateManager.instance = new StateManager(redisClient);
    }
    return StateManager.instance;
  }

  private setupMetrics(): void {
    this.metrics.counter({
      name: 'state_operations_total',
      help: 'Total number of state operations',
      labelNames: ['operation', 'namespace']
    });

    this.metrics.histogram({
      name: 'state_operation_duration_seconds',
      help: 'Duration of state operations in seconds',
      labelNames: ['operation', 'namespace'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1]
    });

    this.metrics.gauge({
      name: 'state_subscribers',
      help: 'Number of state subscribers',
      labelNames: ['namespace']
    });
  }

  /**
   * Register a schema for state validation
   */
  public registerSchema<T>(namespace: string, schema: z.ZodType<T>): void {
    this.schemas.set(namespace, schema);
  }

  /**
   * Get state with validation
   */
  public async get<T>(key: string, options: StateOptions = {}): Promise<T | null> {
    const start = Date.now();
    const namespace = options.namespace || 'default';

    try {
      const data = await this.redis.get(this.getKey(key, namespace));
      
      if (!data) {
        return null;
      }

      const parsed = JSON.parse(data);
      const schema = this.schemas.get(namespace);

      if (schema) {
        return schema.parse(parsed);
      }

      return parsed;
    } catch (error) {
      LoggingManager.getInstance().error('Failed to get state', {
        error: error instanceof Error ? error.message : 'Unknown error',
        key,
        namespace
      });
      
      this.metrics.increment('state_operations_total', {
        operation: 'get_error',
        namespace
      });
      
      throw error;
    } finally {
      const duration = (Date.now() - start) / 1000;
      this.metrics.observe('state_operation_duration_seconds', {
        operation: 'get',
        namespace
      }, duration);
    }
  }

  /**
   * Set state with validation
   */
  public async set<T>(
    key: string,
    value: T,
    options: StateOptions = {}
  ): Promise<void> {
    const start = Date.now();
    const namespace = options.namespace || 'default';

    try {
      const schema = this.schemas.get(namespace);
      if (schema) {
        value = schema.parse(value);
      }

      const serialized = JSON.stringify(value);
      const redisKey = this.getKey(key, namespace);

      if (options.ttl) {
        await this.redis.setex(redisKey, options.ttl, serialized);
      } else {
        await this.redis.set(redisKey, serialized);
      }

      // Notify listeners
      this.notifyListeners(namespace, value);
    } catch (error) {
      LoggingManager.getInstance().error('Failed to set state', {
        error: error instanceof Error ? error.message : 'Unknown error',
        key,
        namespace
      });
      
      this.metrics.increment('state_operations_total', {
        operation: 'set_error',
        namespace
      });
      
      throw error;
    } finally {
      const duration = (Date.now() - start) / 1000;
      this.metrics.observe('state_operation_duration_seconds', {
        operation: 'set',
        namespace
      }, duration);
    }
  }

  /**
   * Subscribe to state changes
   */
  public subscribe<T>(namespace: string, listener: StateListener<T>): () => void {
    if (!this.listeners.has(namespace)) {
      this.listeners.set(namespace, new Set());
    }

    const listeners = this.listeners.get(namespace)!;
    listeners.add(listener);

    this.metrics.set('state_subscribers', { namespace }, listeners.size);

    return () => {
      listeners.delete(listener);
      this.metrics.set('state_subscribers', { namespace }, listeners.size);
    };
  }

  /**
   * Delete state
   */
  public async delete(key: string, options: StateOptions = {}): Promise<void> {
    const start = Date.now();
    const namespace = options.namespace || 'default';

    try {
      await this.redis.del(this.getKey(key, namespace));
    } catch (error) {
      LoggingManager.getInstance().error('Failed to delete state', {
        error: error instanceof Error ? error.message : 'Unknown error',
        key,
        namespace
      });
      
      this.metrics.increment('state_operations_total', {
        operation: 'delete_error',
        namespace
      });
      
      throw error;
    } finally {
      const duration = (Date.now() - start) / 1000;
      this.metrics.observe('state_operation_duration_seconds', {
        operation: 'delete',
        namespace
      }, duration);
    }
  }

  /**
   * Clear all state in a namespace
   */
  public async clear(namespace: string): Promise<void> {
    const start = Date.now();

    try {
      const pattern = this.getKey('*', namespace);
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      LoggingManager.getInstance().error('Failed to clear state', {
        error: error instanceof Error ? error.message : 'Unknown error',
        namespace
      });
      
      this.metrics.increment('state_operations_total', {
        operation: 'clear_error',
        namespace
      });
      
      throw error;
    } finally {
      const duration = (Date.now() - start) / 1000;
      this.metrics.observe('state_operation_duration_seconds', {
        operation: 'clear',
        namespace
      }, duration);
    }
  }

  private getKey(key: string, namespace: string): string {
    return `${namespace}:${key}`;
  }

  private notifyListeners(namespace: string, value: any): void {
    const listeners = this.listeners.get(namespace);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(value);
        } catch (error) {
          LoggingManager.getInstance().error('Failed to notify listener', {
            error: error instanceof Error ? error.message : 'Unknown error',
            namespace
          });
        }
      });
    }
  }
}
