import { EventEmitter } from 'events';
import { Client as SSHClient } from 'ssh2';
import { logger } from '../utils/logger';
import { metrics, recordHostMetric } from '../metrics';
import cache from '../cache';
import { errorAggregator } from './errorAggregator';
import { ServiceOperationExecutor } from './operation';
import { db } from '../db';
import { getDockerService } from './docker.service';
import { SyslogService } from './logging/syslog.service';
import { sshService } from './ssh.service';
import type { Pool, QueryResult } from 'pg';
import type { Host } from '../../types/models-shared';
import type { LogMetadata } from '../../types/logger';
import type { ICacheService } from '../cache/types';
import { TokenPayload } from '../utils/jwt';
import { CommandResult } from '../../types/models-shared';
import { ApiError } from '../../types/error';
import { ContextProvider } from './context.provider';
import type { ChatbotContext } from '../../types/chatbot';
import { z } from 'zod';
import { performance } from 'perf_hooks';

// Service context interface
export interface ServiceContext {
  user?: TokenPayload;
  requestId?: string;
  traceId?: string;
  spanId?: string;
  metadata?: Record<string, unknown>;
}

// Service configuration interface
export interface ServiceConfig {
  retryOptions?: RetryOptions;
  sshOptions?: SSHOptions;
  cacheOptions?: CacheOptions;
  metricsEnabled?: boolean;
  loggingEnabled?: boolean;
  validation?: {
    schema?: z.ZodType<any>;
    strict?: boolean;
  };
}

interface RetryOptions {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  factor: number;
  timeout?: number;
}

interface SSHOptions {
  timeout?: number;
  keepaliveInterval?: number;
  readyTimeout?: number;
}

interface CacheOptions {
  ttl?: number;
  prefix?: string;
}

const defaultRetryOptions: RetryOptions = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  factor: 2,
};

const defaultSSHOptions: SSHOptions = {
  timeout: 10000,
  keepaliveInterval: 10000,
  readyTimeout: 20000,
};

const defaultCacheOptions: CacheOptions = {
  ttl: 3600,
  prefix: 'service:',
};

// Operation result interface with type safety and metrics
export interface OperationMetrics {
  duration: number;
  timestamp: string;
  success: boolean;
  operation: string;
  tags?: Record<string, string | number>;
}

export interface OperationResult<T> {
  data: T;
  metrics: OperationMetrics;
  error?: Error & { timestamp?: string };
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  metrics?: OperationMetrics;
}

// Enhanced service options with proper type definitions
export interface ServiceOptions {
  cache?: {
    ttl?: number;
    prefix?: string;
    bypass?: boolean;
  };
  retry?: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    factor?: number;
    timeout?: number;
  };
  metrics?: {
    tags?: Record<string, string | number>;
    enabled?: boolean;
  };
  validation?: {
    schema?: z.ZodType<any>;
    strict?: boolean;
  };
}

export abstract class BaseService extends EventEmitter {
  protected readonly logger = logger;
  protected readonly metrics = metrics;
  protected readonly cache: ICacheService = cache;
  protected readonly db = db;
  protected readonly dockerService = getDockerService();
  protected readonly syslogService = new SyslogService();
  protected readonly sshService = sshService;
  protected readonly contextProvider: ContextProvider = ContextProvider.getInstance();
  
  protected context?: ServiceContext;
  protected config: ServiceConfig;

  private operationCount = 0;
  private errorCount = 0;
  private lastError?: Error & { timestamp?: string };
  private startTime: number = Date.now();

  constructor(config: ServiceConfig = {}) {
    super();
    this.config = {
      retryOptions: { ...defaultRetryOptions, ...config.retryOptions },
      sshOptions: { ...defaultSSHOptions, ...config.sshOptions },
      cacheOptions: { ...defaultCacheOptions, ...config.cacheOptions },
      metricsEnabled: config.metricsEnabled ?? true,
      loggingEnabled: config.loggingEnabled ?? true,
      validation: config.validation,
    };
  }

  /**
   * Set request context and update chatbot context
   */
  protected setContext(context: ServiceContext): void {
    this.context = context;
    this.contextProvider.setContext(context);
    this.logger.withContext({
      requestId: context.requestId,
      traceId: context.traceId,
      userId: context.user?.id,
    });
  }

  /**
   * Get current chatbot context
   */
  protected async getChatbotContext(): Promise<ChatbotContext> {
    return this.contextProvider.getCurrentContext();
  }

  /**
   * Update chatbot context with query and result
   */
  protected updateChatbotContext(query: string, result: unknown): void {
    this.contextProvider.updateLastQuery(query, result);
  }

  /**
   * Cleanup resources before service shutdown
   */
  async cleanup(): Promise<void> {
    try {
      await Promise.all([
        this.cache.clear(),
        this.syslogService.cleanup(),
        this.dockerService.cleanup(),
      ]);
      
      // Close all SSH connections
      this.sshService.disconnectAll();
    } catch (error) {
      this.handleError(error, { operation: 'service_cleanup' });
    }
  }

  /**
   * Enhanced operation execution with metrics, validation, and error handling
   */
  protected async executeOperation<T>(
    operation: ServiceOperationExecutor<T>,
    options: ServiceOptions = {}
  ): Promise<OperationResult<T>> {
    const operationId = ++this.operationCount;
    const startTime = performance.now();

    try {
      // Validate input if schema is provided
      if (options.validation?.schema) {
        const parseResult = options.validation.schema.safeParse(operation.input);
        if (!parseResult.success) {
          throw new ApiError('ValidationError', parseResult.error.message);
        }
      }

      // Execute operation with retry logic if configured
      const data = await this.withRetry(
        async () => operation.execute(),
        options.retry
      );

      const duration = performance.now() - startTime;
      const result: OperationResult<T> = {
        data,
        metrics: {
          duration,
          timestamp: new Date().toISOString(),
          success: true,
          operation: operation.name || `anonymous_${operationId}`,
          tags: options.metrics?.tags,
        },
      };

      this.emit('operation:success', result);
      return result;
    } catch (error) {
      this.errorCount++;
      this.lastError = error instanceof Error ? error : new Error(String(error));
      this.lastError.timestamp = new Date().toISOString();

      const result: OperationResult<T> = {
        data: null as T,
        metrics: {
          duration: performance.now() - startTime,
          timestamp: new Date().toISOString(),
          success: false,
          operation: operation.name || `anonymous_${operationId}`,
          tags: options.metrics?.tags,
        },
        error: this.lastError,
      };

      this.emit('operation:error', { error: this.lastError, result });
      throw this.lastError;
    }
  }

  /**
   * Execute an operation with proper context, logging, metrics, and error handling
   */
  protected async executeOperationLegacy<T>(
    operation: () => Promise<T>,
    options: ServiceOptions = {}
  ): Promise<ServiceResult<T>> {
    const executor = new ServiceOperationExecutor(operation, options);
    executor.on('success', event => this.emit('success', event));
    executor.on('error', event => this.emit('error', event));
    return executor.execute();
  }

  /**
   * Execute an operation with an SSH connection
   */
  protected async withSSH<T>(
    host: Host,
    operation: (client: SSHClient) => Promise<T>
  ): Promise<T> {
    try {
      const client = await this.sshService.executeCommand(host.hostname, '');
      const result = await operation(client as unknown as SSHClient);
      return result;
    } catch (error) {
      this.handleError(error, { 
        operation: 'ssh_operation',
        host: host.hostname,
      });
      throw error;
    }
  }

  /**
   * Execute SSH command
   */
  protected async executeSSHCommand(host: Host, command: string): Promise<CommandResult> {
    return this.sshService.executeCommand(host.hostname, command);
  }

  /**
   * Cache data with consistent error handling and type safety
   */
  protected async withCache<T>(
    key: string,
    operation: () => Promise<T>,
    options: ServiceOptions['cache'] = {}
  ): Promise<T> {
    const { ttl = this.config.cacheOptions?.ttl, bypass = false } = options;
    
    if (bypass) {
      return operation();
    }

    try {
      const cachedResult = await this.cache.get<T>(key);
      if (cachedResult !== null) {
        return cachedResult;
      }
    } catch (error) {
      this.logger.warn('Cache retrieval failed', { error, key });
    }

    const result = await operation();
    
    try {
      await this.cache.set(key, result, ttl);
    } catch (error) {
      this.logger.warn('Cache storage failed', { error, key });
    }

    return result;
  }

  /**
   * Retry operation with exponential backoff
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    options?: ServiceOptions['retry']
  ): Promise<T> {
    const retryConfig = {
      ...this.config.retryOptions,
      ...options,
    };

    let lastError: Error | undefined;
    let attempt = 0;
    let delay = retryConfig.initialDelay;

    while (attempt < retryConfig.maxAttempts) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempt++;

        if (attempt === retryConfig.maxAttempts) {
          break;
        }

        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * retryConfig.factor, retryConfig.maxDelay);
      }
    }

    throw lastError || new Error('Operation failed after max retry attempts');
  }

  /**
   * Get service health metrics
   */
  protected getHealthMetrics(): Record<string, unknown> {
    return {
      uptime: Date.now() - this.startTime,
      operationCount: this.operationCount,
      errorCount: this.errorCount,
      errorRate: this.operationCount ? (this.errorCount / this.operationCount) : 0,
      lastError: this.lastError ? {
        message: this.lastError.message,
        timestamp: this.lastError.timestamp,
      } : null,
    };
  }

  /**
   * Execute a database transaction
   */
  protected async withTransaction<T>(
    operation: (client: Pool) => Promise<T>
  ): Promise<T> {
    try {
      const result = await operation(this.db as unknown as Pool);
      return result;
    } catch (error) {
      this.handleError(error, { operation: 'database_transaction' });
      throw error;
    }
  }

  /**
   * Execute a database query
   */
  protected async query<T = unknown>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    return this.db.query<T>(text, params);
  }

  /**
   * Docker operations
   */
  protected async withDocker<T>(operation: (docker: any) => Promise<T>): Promise<T> {
    try {
      return await operation(this.dockerService);
    } catch (error) {
      this.handleError(error, { operation: 'docker_operation' });
      throw error;
    }
  }

  /**
   * Syslog operations
   */
  protected async withSyslog<T>(operation: (syslog: SyslogService) => Promise<T>): Promise<T> {
    try {
      return await operation(this.syslogService);
    } catch (error) {
      this.handleError(error, { operation: 'syslog_operation' });
      throw error;
    }
  }

  /**
   * Handle and log errors consistently
   */
  protected handleError(error: unknown, context: Record<string, unknown> = {}): never {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const metadata: LogMetadata = {
      ...context,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    };

    this.logger.error('Operation failed', metadata);
    errorAggregator.trackError(
      error instanceof Error ? error : new Error(errorMessage),
      metadata
    );

    throw error;
  }

  /**
   * Record metrics with consistent error handling
   */
  protected recordMetric(
    metricType: string,
    value: number
  ): void {
    try {
      if (this.context?.metadata?.hostId) {
        recordHostMetric(this.context.metadata.hostId as string, metricType, value);
      }
    } catch (error) {
      this.logger.error('Failed to record metric', {
        error: error instanceof Error ? error.message : 'Unknown error',
        metricType,
        value,
      });
    }
  }

  /**
   * Authentication helper methods
   */
  protected async withAuth<T>(operation: (user: TokenPayload) => Promise<T>): Promise<T> {
    const user = this.getCurrentUser();
    if (!user) {
      throw new ApiError('Unauthorized', undefined, 401);
    }
    return operation(user);
  }

  protected getCurrentUser(): TokenPayload | undefined {
    return this.context?.user;
  }

  protected checkRole(requiredRole: string): void {
    const user = this.getCurrentUser();
    if (!user || user.role !== requiredRole) {
      throw new ApiError('Insufficient permissions', undefined, 403);
    }
  }

  protected checkOwnership(resourceUserId: string): void {
    const user = this.getCurrentUser();
    if (!user || user.id !== resourceUserId) {
      throw new ApiError('Access denied', undefined, 403);
    }
  }

  protected clearContext(): void {
    this.context = undefined;
    this.contextProvider.clearContext();
  }

  protected getMetrics(): ServiceMetrics {
    return {
      operationCount: this.operationCount,
      errorCount: this.errorCount,
      lastError: this.lastError,
      uptime: Date.now() - this.startTime,
    };
  }
}

interface ServiceMetrics {
  operationCount: number;
  errorCount: number;
  lastError?: Error & { timestamp?: string };
  uptime: number;
}
