import type { LogMetadata } from './logger';
import type { Host } from './host';
import type { Container, Stack } from './models-shared';

/**
 * Service operation result with metadata
 */
export interface ServiceResult<T> {
  data: T;
  metadata?: LogMetadata;
  duration?: number;
  cached?: boolean;
}

/**
 * Service operation options
 */
export interface ServiceOptions {
  // Retry options
  retry?: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    factor?: number;
    timeout?: number;
  };
  // Cache options
  cache?: {
    ttl?: number;
    key?: string;
    bypass?: boolean;
  };
  // Metrics options
  metrics?: {
    tags?: Record<string, string | number>;
    type?: string;
  };
  // SSH options
  ssh?: {
    timeout?: number;
    keepaliveInterval?: number;
    readyTimeout?: number;
  };
}

/**
 * Service operation context
 */
export interface ServiceContext {
  operationId: string;
  startTime: number;
  metadata: LogMetadata;
  options: ServiceOptions;
}

/**
 * Service health check result
 */
export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  details: {
    cache?: {
      status: 'connected' | 'disconnected';
      latency?: number;
    };
    metrics?: {
      status: 'available' | 'unavailable';
      lastUpdate?: Date;
    };
    resources?: {
      memory: number;
      cpu: number;
      connections: number;
    };
  };
  lastCheck: Date;
}

/**
 * Service statistics
 */
export interface ServiceStats {
  operations: {
    total: number;
    failed: number;
    duration: {
      avg: number;
      p95: number;
      p99: number;
    };
  };
  cache: {
    hits: number;
    misses: number;
    ratio: number;
  };
  resources: {
    memory: number;
    cpu: number;
    connections: number;
  };
}

/**
 * Service event types
 */
export enum ServiceEventType {
  OPERATION_START = 'operation:start',
  OPERATION_END = 'operation:end',
  OPERATION_ERROR = 'operation:error',
  CACHE_HIT = 'cache:hit',
  CACHE_MISS = 'cache:miss',
  RETRY_ATTEMPT = 'retry:attempt',
  SSH_CONNECT = 'ssh:connect',
  SSH_DISCONNECT = 'ssh:disconnect',
  HEALTH_CHECK = 'health:check',
  RESOURCE_WARNING = 'resource:warning',
  CLEANUP_START = 'cleanup:start',
  CLEANUP_END = 'cleanup:end'
}

/**
 * Service event payload
 */
export interface ServiceEvent<T = unknown> {
  type: ServiceEventType;
  timestamp: Date;
  context: ServiceContext;
  data?: T;
  error?: Error;
  metadata?: LogMetadata;
}

/**
 * Service operation executor
 */
export interface ServiceExecutor<T> {
  execute(context: ServiceContext): Promise<ServiceResult<T>>;
  validate?(): Promise<void>;
  cleanup?(): Promise<void>;
}

/**
 * Service operation builder
 */
export interface ServiceOperationBuilder<T> {
  withRetry(options?: ServiceOptions['retry']): this;
  withCache(options?: ServiceOptions['cache']): this;
  withMetrics(options?: ServiceOptions['metrics']): this;
  withSSH(host: Host, options?: ServiceOptions['ssh']): this;
  withTimeout(ms: number): this;
  withValidation(validator: () => Promise<void>): this;
  withCleanup(cleanup: () => Promise<void>): this;
  execute(): Promise<ServiceResult<T>>;
}
