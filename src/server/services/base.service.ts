import { EventEmitter } from 'events';
import { LoggingManager } from '../managers/LoggingManager';
import { MetricsManager } from '../managers/MetricsManager';
import { LoggerAdapter } from '../utils/logging/logger.adapter';
import type { ServiceContext as IServiceContext, ServiceOptions as IServiceOptions } from '../../types/service';
import type { LogMetadata } from '../../types/logger';
import type { ChatbotContext } from '../../types/chatbot';
import { ApiError } from '../../types/error';
import type { DockerService } from './docker.service';
import type { SSHService } from './ssh.service';
import type { Cache } from '../../types/cache';
import type { Redis } from '../../types/redis';

// Error and options interfaces
export interface ServiceError extends Error {
  code?: string;
  details?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  retryable?: boolean;
}

// Extend base service options with implementation-specific options
export interface ServiceOptions {
  name?: string;
  logger?: LoggingManager;
  metrics?: MetricsManager;
  cache?: Cache;
  db?: Redis;
  dockerService?: DockerService;
  sshService?: SSHService;
  context?: ChatbotContext;
  retry?: IServiceOptions['retry'];
  ssh?: IServiceOptions['ssh'];
}

// Extend base service context with implementation-specific context
export interface ServiceContext extends Omit<IServiceContext, 'options'> {
  operationId: string;
  startTime: number;
  metadata: LogMetadata;
  options: ServiceOptions;
  chatbot?: ChatbotContext;
}

export interface ValidationSchema<T> {
  parse(data: unknown): T;
}

export interface ValidationOptions {
  schema?: ValidationSchema<unknown>;
  strict?: boolean;
  partial?: boolean;
}

export interface RetryOptions {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  factor: number;
  timeout?: number;
  retryableErrors?: Array<string | RegExp>;
}

export interface SSHOptions {
  timeout?: number;
  keepaliveInterval?: number;
  readyTimeout?: number;
}

export interface CacheOptions {
  ttl?: number;
  prefix?: string;
}

export interface ServiceMetrics {
  operationCount: number;
  errorCount: number;
  lastError?: ServiceError;
  uptime: number;
}

export interface OperationOptions {
  validateInput?: boolean;
  cache?: CacheOptions;
  retry?: RetryOptions;
  metrics?: {
    tags?: Record<string, string | number>;
    type?: string;
  };
  context?: ServiceContext;
}

export interface ServiceOperationExecutor<TOutput, TInput = unknown> {
  (input?: TInput, context?: ChatbotContext): Promise<TOutput>;
  name?: string;
  schema?: ValidationSchema<TInput>;
}

export interface OperationMetrics {
  duration: number;
  success: boolean;
  error?: ServiceError;
}

export interface OperationResult<T> {
  data: T;
  metadata: Record<string, unknown>;
  duration: number;
  cached: boolean;
}

export interface MetricsOptions {
  tags?: Record<string, string | number>;
  type?: string;
  operation?: string;
  customMetrics?: Record<string, number>;
}

export class BaseService extends EventEmitter {
  protected readonly name: string;
  protected readonly logger: LoggerAdapter;
  protected readonly metrics: MetricsManager;
  protected readonly cache: Cache;
  protected readonly db: Redis;
  protected readonly dockerService: DockerService;
  protected readonly sshService: SSHService;
  protected context: ServiceContext;
  protected readonly status: 'ready' | 'error' = 'ready';
  protected readonly version: string = '1.0.0';
  protected lastError?: ServiceError;

  constructor(options: ServiceOptions = {}) {
    super();
    this.name = options.name || this.constructor.name;
    this.logger = new LoggerAdapter(options.logger || LoggingManager.getInstance(), {
      service: this.name,
    });
    this.metrics = options.metrics || MetricsManager.getInstance();
    this.cache = options.cache as Cache;
    this.db = options.db as Redis;
    this.dockerService = options.dockerService as DockerService;
    this.sshService = options.sshService as SSHService;
    this.context = this.createContext(options);
  }

  protected createContext(options: ServiceOptions = {}): ServiceContext {
    return {
      operationId: crypto.randomUUID(),
      startTime: Date.now(),
      metadata: {},
      options,
    } as ServiceContext;
  }

  protected normalizeError(error: unknown): ServiceError {
    if (error instanceof ApiError) {
      return {
        name: error.name || 'ApiError',
        message: error.message,
        code: error instanceof Error ? error.message : String(error),
        details: {},
        metadata: {},
        retryable: false
      };
    }

    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return {
      name: 'UnknownError',
      message: String(error),
    };
  }

  protected createError(message: string, code?: string, details?: Record<string, unknown>): ServiceError {
    return {
      name: 'ServiceError',
      message,
      code,
      details,
    };
  }

  protected validateInput<T>(input: T, schema?: ValidationSchema<T>): void {
    if (!schema) {
      return;
    }

    try {
      schema.parse(input);
    } catch (error) {
      throw new ApiError('Invalid input', {
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  protected async executeOperation<TOutput, TInput = unknown>(
    executor: ServiceOperationExecutor<TOutput, TInput>,
    input?: TInput,
    context?: ChatbotContext
  ): Promise<OperationResult<TOutput>> {
    const startTime = Date.now();

    try {
      if (executor.schema) {
        this.validateInput(input, executor.schema);
      }

      const result = await executor(input, context);

      this.recordMetrics(startTime, executor.name || 'unknown', {
        success: 'true',
      });

      return {
        data: result,
        metadata: {},
        duration: Date.now() - startTime,
        cached: false
      };
    } catch (error) {
      const normalizedError = this.normalizeError(error);
      this.lastError = normalizedError;

      this.recordMetrics(startTime, executor.name || 'unknown', {
        success: 'false',
        error: normalizedError.code || 'unknown',
      });

      throw normalizedError;
    }
  }

  protected async cleanup(): Promise<void> {
    try {
      if (this.dockerService?.cleanup) {
        await this.dockerService.cleanup();
      }
      if (this.sshService?.disconnectAll) {
        this.sshService.disconnectAll();
      }
    } catch (error) {
      this.logger.error('Error during cleanup', { error: this.normalizeError(error) });
    }
  }

  protected recordMetrics(startTime: number, metricType: string, labels: Record<string, string> = {}): void {
    const duration = Date.now() - startTime;
    const metricLabels = {
      ...labels,
      service: this.name,
    };

    try {
      const histogram = this.metrics.createHistogram(`${metricType}_duration_seconds`);
      histogram.observe(metricLabels, duration / 1000);
      
      const counter = this.metrics.createCounter(`${metricType}_total`);
      counter.inc(metricLabels);

      if (this.lastError) {
        const errorCounter = this.metrics.createCounter(`${metricType}_errors_total`);
        errorCounter.inc(metricLabels);
      }
    } catch (error) {
      this.logger.warn('Failed to record metrics', { error: this.normalizeError(error) });
    }
  }

  protected setContext(newContext: ServiceContext): void {
    this.context = newContext;
  }

  protected getChatbotContext(): ChatbotContext | undefined {
    return this.context?.chatbot;
  }

  protected updateChatbotContext(query: string, result: unknown): void {
    if (!this.context?.chatbot) {
      return;
    }

    this.context.chatbot = {
      ...this.context.chatbot,
      lastQuery: {
        timestamp: new Date(),
        query,
        result,
      },
    };
  }

  protected async withCache<T>(
    executor: () => Promise<T>,
    options: { ttl?: number; key?: string; bypass?: boolean } = {}
  ): Promise<T> {
    if (!this.cache?.cacheSession || options.bypass) {
      return executor();
    }

    const key = options.key || executor.name || 'default';

    try {
      const cachedResult = await this.cache.getSession(key);
      if (typeof cachedResult === 'string') {
        const parsed = JSON.parse(cachedResult) as T;
        return parsed;
      }
    } catch (error) {
      this.logger.warn('Cache retrieval failed', { error: this.normalizeError(error) });
    }

    const result = await executor();
    try {
      await this.cache.cacheSession(key, JSON.stringify(result));
    } catch (error) {
      this.logger.warn('Cache storage failed', { error: this.normalizeError(error) });
    }

    return result;
  }

  protected handleError(error: unknown, metadata?: Record<string, unknown>): void {
    const normalizedError = this.normalizeError(error);
    const errorMetadata = {
      ...metadata,
      error: normalizedError,
      service: this.name,
      component: this.name
    };
    
    this.logger.error(normalizedError.message, errorMetadata);
    this.lastError = normalizedError;
  }
}
