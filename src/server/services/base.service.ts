import { EventEmitter } from 'events';
import { Client as SSHClient } from 'ssh2';
import { LoggingManager } from '../utils/logging/LoggingManager';
import { metrics, recordHostMetric } from '../metrics';
import type { OperationLabels, ServiceMetricLabels } from '../metrics';
import cache from '../cache';
import { errorAggregator } from './errorAggregator';
import { ServiceOperationExecutor } from './operation';
import { db } from '../db';
import { DockerService } from './docker.service';
import { SyslogService } from './logging/syslog.service';
import { sshService } from './ssh.service';
import type { Pool, QueryResult } from 'pg';
import type { Host } from '../../types/models-shared';
import type { LogMetadata } from '../../types/logger';
import type { ICacheService } from '../cache/types';
import { AccessTokenPayloadDto, RefreshTokenPayloadDto } from '../routes/auth/dto/auth.dto';
import { CommandResult } from '../../types/models-shared';
import { ApiError } from '../../types/error';
import { ContextProvider } from './context.provider';
import type { ChatbotContext } from '../../types/chatbot';
import type { Schema } from '../../types/validation';
import { z } from 'zod';

export interface ServiceContext {
  user?: AccessTokenPayloadDto | RefreshTokenPayloadDto;
  requestId?: string;
  traceId?: string;
  spanId?: string;
  metadata?: Record<string, unknown>;
  chatbot?: ChatbotContext;
}

export type ValidationSchema<T> = z.ZodType<T>;

export interface ValidationOptions {
  schema?: ValidationSchema<unknown>;
  strict?: boolean;
  partial?: boolean;
}

export interface ServiceConfig {
  retryOptions?: RetryOptions;
  sshOptions?: SSHOptions;
  cacheOptions?: CacheOptions;
  metricsEnabled?: boolean;
  loggingEnabled?: boolean;
  validation?: ValidationOptions;
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

export interface ServiceError extends Error {
  code?: string;
  timestamp?: string;
  details?: Record<string, unknown>;
  retryable?: boolean;
  attempt?: number;
}

const defaultRetryOptions: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  factor: 2,
  timeout: 30000
};

const defaultSSHOptions: Required<SSHOptions> = {
  timeout: 10000,
  keepaliveInterval: 10000,
  readyTimeout: 20000
};

const defaultCacheOptions: Required<CacheOptions> = {
  ttl: 300,
  prefix: 'service:'
};

export interface ServiceOperationExecutor<T, TInput = void> {
  (input: TInput, context?: ChatbotContext): Promise<T>;
  schema?: ValidationSchema<TInput>;
}

export interface ServiceOptions<TInput = void> {
  cache?: {
    ttl?: number;
    prefix?: string;
  };
  retry?: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
  };
  metrics?: MetricsOptions;
  context?: ChatbotContext;
  validation?: ValidationOptions;
  input?: TInput;
}

export interface OperationMetrics {
  duration: number;
  timestamp: string;
  success: boolean;
  operation: string;
  tags?: Record<string, string | number>;
  error?: ServiceError;
}

export interface OperationResult<T> {
  data: T;
  metrics: OperationMetrics;
  error?: ServiceError;
}

export interface MetricsOptions {
  enabled?: boolean;
  tags?: Record<string, string | number>;
  operation?: string;
  customMetrics?: Record<string, number>;
}

export class BaseService extends EventEmitter {
  protected readonly logger = logger;
  protected readonly metrics = metrics;
  protected readonly cache: ICacheService = cache;
  protected readonly db = db;
  protected readonly dockerService = new DockerService();
  protected readonly syslogService = new SyslogService();
  protected readonly sshService = sshService;
  protected readonly contextProvider: ContextProvider = ContextProvider.getInstance();
  protected context?: ServiceContext;
  protected config: Required<ServiceConfig>;
  private operationCount = 0;
  private errorCount = 0;
  private lastError?: ServiceError;
  private startTime: number = Date.now();

  constructor(config: ServiceConfig = {}) {
    super();
    this.config = {
      retryOptions: { ...defaultRetryOptions, ...config.retryOptions },
      sshOptions: { ...defaultSSHOptions, ...config.sshOptions },
      cacheOptions: { ...defaultCacheOptions, ...config.cacheOptions },
      metricsEnabled: config.metricsEnabled ?? true,
      loggingEnabled: config.loggingEnabled ?? true,
      validation: config.validation ?? { strict: false }
    };
  }

  setContext(context: ServiceContext): void {
    this.context = context;
    this.contextProvider.updateContext(context);
  }

  async getChatbotContext(): Promise<ChatbotContext> {
    return this.contextProvider.getContext();
  }

  async updateChatbotContext(query: string, result: unknown): Promise<void> {
    await this.contextProvider.updateContext({ query, result });
  }

  async cleanup(): Promise<void> {
    await Promise.all([
      this.cache?.clear?.(),
      this.dockerService?.cleanup?.(),
      this.syslogService?.cleanup?.()
    ]);
  }

  protected async executeOperation<T, TInput = void>(
    executor: ServiceOperationExecutor<T, TInput>,
    options: ServiceOptions<TInput> = {}
  ): Promise<OperationResult<T>> {
    const startTime = process.hrtime.bigint();
    const operationName = options.metrics?.operation || executor.name || 'unknown';
    this.operationCount++;

    try {
      const input = await this.validateInput(
        options.input as TInput,
        executor.schema,
        options.validation
      );

      const result = await this.withRetry(
        async () => {
          if (options.cache) {
            return this.withCache(
              () => executor(input, options.context),
              options.cache.ttl || 3600,
              options.cache.prefix
            );
          }
          return executor(input, options.context);
        },
        options.retry
      );

      const duration = Number(process.hrtime.bigint() - startTime) / 1e6;
      const metrics: OperationMetrics = {
        duration,
        timestamp: new Date().toISOString(),
        success: true,
        operation: operationName,
        tags: options.metrics?.tags
      };

      if (this.config.metricsEnabled && options.metrics?.enabled !== false) {
        this.recordOperationMetrics(operationName, duration, true, options.metrics);
      }

      return { data: result, metrics };

    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1e6;
      this.errorCount++;
      
      const serviceError = this.normalizeError(error);
      serviceError.timestamp = new Date().toISOString();
      this.lastError = serviceError;

      const metrics: OperationMetrics = {
        duration,
        timestamp: new Date().toISOString(),
        success: false,
        operation: operationName,
        tags: options.metrics?.tags,
        error: serviceError
      };

      if (this.config.metricsEnabled && options.metrics?.enabled !== false) {
        this.recordOperationMetrics(operationName, duration, false, options.metrics);
      }

      throw serviceError;
    }
  }

  private async validateInput<T>(
    input: T | undefined,
    schema?: ValidationSchema<T>,
    options?: ValidationOptions
  ): Promise<T> {
    if (!schema) {
      if (options?.strict) {
        throw new Error('No validation schema provided for strict operation');
      }
      return input as T;
    }

    try {
      const validationSchema = options?.partial
        ? schema.partial()
        : schema;

      return await validationSchema.parseAsync(input);
    } catch (error) {
      const validationError = new Error('Validation failed');
      (validationError as ServiceError).code = 'VALIDATION_ERROR';
      (validationError as ServiceError).details = error instanceof Error ? { message: error.message } : error;
      throw validationError;
    }
  }

  private normalizeError(error: unknown): ServiceError {
    if (error instanceof Error) {
      return {
        ...error,
        code: (error as ServiceError).code,
        details: (error as ServiceError).details,
        timestamp: (error as ServiceError).timestamp,
        retryable: (error as ServiceError).retryable,
        attempt: (error as ServiceError).attempt
      };
    }

    const serviceError = new Error(String(error));
    (serviceError as ServiceError).code = 'UNKNOWN_ERROR';
    (serviceError as ServiceError).details = { originalError: error };
    return serviceError as ServiceError;
  }

  protected async withCache<T>(
    executor: ServiceOperationExecutor<T>,
    ttlSeconds: number,
    prefix = ''
  ): Promise<T> {
    if (!this.cache) {
      return executor();
    }

    const cacheKey = `${prefix}${this.getCacheKey(executor)}`;
  
    try {
      const cachedValue = await this.cache.get<T>(cacheKey);
      if (cachedValue !== null) {
        return cachedValue;
      }

      const result = await executor();
      await this.cache.set(cacheKey, result, ttlSeconds);
      return result;
    } catch (error) {
      const serviceError: ServiceError = error instanceof Error ? error : new Error(String(error));
      serviceError.code = 'CACHE_ERROR';
      throw serviceError;
    }
  }

  private getCacheKey(executor: ServiceOperationExecutor<unknown>): string {
    return `${executor.name || executor.toString()}_${JSON.stringify(this.context || {})}`;
  }

  protected async withRetry<T>(
    executor: () => Promise<T>,
    options?: ServiceOptions['retry']
  ): Promise<T> {
    const retryOpts = {
      maxAttempts: options?.maxAttempts || this.config.retryOptions.maxAttempts,
      initialDelay: options?.initialDelay || this.config.retryOptions.initialDelay,
      maxDelay: options?.maxDelay || this.config.retryOptions.maxDelay,
      factor: this.config.retryOptions.factor,
      timeout: this.config.retryOptions.timeout,
      retryableErrors: this.config.retryOptions.retryableErrors
    };

    let attempt = 1;
    let delay = retryOpts.initialDelay;

    while (attempt <= retryOpts.maxAttempts) {
      try {
        const timeoutPromise = retryOpts.timeout
          ? new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Operation timed out')), retryOpts.timeout)
            )
          : null;

        const executorPromise = executor();
        const result = await (timeoutPromise
          ? Promise.race([executorPromise, timeoutPromise])
          : executorPromise);

        return result;
      } catch (error) {
        const serviceError: ServiceError = error instanceof Error ? error : new Error(String(error));
        serviceError.attempt = attempt;
        
        const isRetryable = this.isRetryableError(serviceError, retryOpts.retryableErrors);
        serviceError.retryable = isRetryable;

        if (!isRetryable || attempt === retryOpts.maxAttempts) {
          throw serviceError;
        }

        this.LoggingManager.getInstance().warn(`Operation failed (attempt ${attempt}/${retryOpts.maxAttempts})`, {
          error: serviceError.message,
          code: serviceError.code,
          attempt,
          nextDelay: delay
        });

        await this.delay(delay);
        delay = Math.min(delay * retryOpts.factor, retryOpts.maxDelay);
        attempt++;
      }
    }

    throw new Error('Max retry attempts reached');
  }

  private isRetryableError(error: ServiceError, retryableErrors?: Array<string | RegExp>): boolean {
    if (!retryableErrors?.length) {
      return true; // Default to retrying all errors if no patterns specified
    }

    return retryableErrors.some(pattern => {
      if (pattern instanceof RegExp) {
        return pattern.test(error.message) || (error.code && pattern.test(error.code));
      }
      return error.code === pattern;
    });
  }

  protected handleError(error: unknown, context: Record<string, unknown> = {}): never {
    const serviceError: ServiceError = error instanceof Error ? error : new Error(String(error));
    
    const metadata: LogMetadata = {
      ...context,
      error: serviceError.message,
      code: serviceError.code,
      details: serviceError.details,
      stack: serviceError.stack,
      attempt: serviceError.attempt,
      retryable: serviceError.retryable
    };

    this.LoggingManager.getInstance().error('Operation failed', metadata);
    errorAggregator.trackError(serviceError, metadata);

    throw serviceError;
  }

  protected getMetrics(): ServiceMetrics {
    const uptime = Date.now() - this.startTime;
  
    const baseMetrics = {
      operationCount: this.operationCount,
      errorCount: this.errorCount,
      lastError: this.lastError,
      uptime
    };

    if (this.config.metricsEnabled) {
      metrics.gauge('service_uptime', uptime);
      metrics.gauge('service_operation_count', this.operationCount);
      metrics.gauge('service_error_count', this.errorCount);
    }

    return baseMetrics;
  }

  protected getHealthMetrics(): Record<string, unknown> {
    const metrics = this.getMetrics();
    return {
      ...metrics,
      healthy: this.errorCount === 0 || (Date.now() - (this.lastError?.timestamp ? new Date(this.lastError.timestamp).getTime() : 0)) > 300000, // 5 minutes
      status: this.errorCount === 0 ? 'healthy' : 'degraded'
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private recordOperationMetrics(
    operation: string,
    duration: number,
    success: boolean,
    options?: MetricsOptions
  ): void {
    const labels: OperationLabels = {
      operation,
      success: String(success),
      service: this.constructor.name
    };

    // Record operation duration
    metrics.histogram('operation_duration', duration, labels);

    // Record operation result
    metrics.increment('operation_total', 1, labels);

    // Record custom metrics if provided
    if (options?.customMetrics) {
      Object.entries(options.customMetrics).forEach(([metric, value]) => {
        const metricLabels: ServiceMetricLabels = {
          service: this.constructor.name,
          metric_type: metric
        };
        metrics.gauge(metric, value, metricLabels);
      });
    }

    // Record service metrics
    const serviceLabels = { service: this.constructor.name };
    metrics.gauge('operation_count', this.operationCount, serviceLabels);
    metrics.gauge('error_count', this.errorCount, serviceLabels);
  }
}

