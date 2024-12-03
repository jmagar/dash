import type { LogMetadata } from './logger';
import type { EventEmitter } from 'events';
import type { default as Redis, RedisOptions, RedisKey, RedisValue } from 'ioredis';
import type { ApiError } from './api-error'; // Assuming ApiError is defined in ./api-error.ts

// Redis Configuration Types
export interface RedisConnectionConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  maxRetriesPerRequest?: number;
  enableReadyCheck?: boolean;
  retryStrategy?: (times: number) => number | null;
}

export interface RedisMemoryConfig {
  limit: string;
  maxKeys: number;
  evictionPolicy?: 'noeviction' | 'volatile-lru' | 'allkeys-lru' | 'volatile-random' | 'allkeys-random' | 'volatile-ttl';
  warningThreshold?: number;
}

export interface RedisMetricsConfig {
  enabled: boolean;
  interval: number;
  detailed: boolean;
  customMetrics?: Record<string, unknown>;
}

export interface RedisRetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  factor: number;
  timeout?: number;
}

export interface RedisSerialization {
  serialize: <T>(data: T) => string;
  deserialize: <T>(data: string) => T;
}

export interface RedisConfig {
  connection: RedisConnectionConfig;
  memory: RedisMemoryConfig;
  metrics: RedisMetricsConfig;
  retry: RedisRetryConfig;
  serialization: RedisSerialization;
}

// Redis Operation Types
export type RedisKeyType = string;
export type RedisData = unknown;

export interface RedisOperationMetadata {
  duration: number;
  retries: number;
  timestamp: Date;
  [key: string]: unknown;
}

export interface RedisResult<T> {
  success: boolean;
  data?: T;
  error?: RedisError;
  metadata: RedisOperationMetadata;
}

// Redis Error Types
export enum RedisErrorCode {
  INVALID_CONFIG = 'INVALID_CONFIG',
  NOT_CONNECTED = 'NOT_CONNECTED',
  OPERATION_ERROR = 'OPERATION_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  SERIALIZATION_ERROR = 'SERIALIZATION_ERROR',
  DESERIALIZATION_ERROR = 'DESERIALIZATION_ERROR',
  MEMORY_LIMIT_EXCEEDED = 'MEMORY_LIMIT_EXCEEDED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RETRY_EXHAUSTED = 'RETRY_EXHAUSTED',
  KEY_TOO_LONG = 'KEY_TOO_LONG',
  INVALID_KEY = 'INVALID_KEY',
  PATTERN_REQUIRED = 'PATTERN_REQUIRED',
}

export interface RedisErrorMetadata extends LogMetadata {
  operation?: string;
  key?: RedisKeyType;
  duration?: number;
  retries?: number;
  memory?: {
    used: number;
    limit: number;
    available: number;
  };
}

export interface RedisErrorOptions {
  code: RedisErrorCode;
  message: string;
  metadata?: RedisErrorMetadata;
  cause?: unknown;
  status?: number;
}

export class RedisError extends ApiError {
  public readonly code: RedisErrorCode;

  constructor(options: RedisErrorOptions) {
    super(
      options.message,
      options.cause,
      options.status ?? 500,
      options.metadata
    );
    this.name = 'RedisError';
    this.code = options.code;
    Object.setPrototypeOf(this, RedisError.prototype);
  }

  public override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      code: this.code,
    };
  }
}

export const REDIS_ERROR_MESSAGES: Readonly<Record<RedisErrorCode, string>> = {
  [RedisErrorCode.INVALID_CONFIG]: 'Invalid Redis configuration',
  [RedisErrorCode.NOT_CONNECTED]: 'Redis client is not connected',
  [RedisErrorCode.OPERATION_ERROR]: 'Redis operation failed',
  [RedisErrorCode.CONNECTION_ERROR]: 'Failed to connect to Redis',
  [RedisErrorCode.AUTHENTICATION_ERROR]: 'Redis authentication failed',
  [RedisErrorCode.SERIALIZATION_ERROR]: 'Failed to serialize data',
  [RedisErrorCode.DESERIALIZATION_ERROR]: 'Failed to deserialize data',
  [RedisErrorCode.MEMORY_LIMIT_EXCEEDED]: 'Redis memory limit exceeded',
  [RedisErrorCode.VALIDATION_ERROR]: 'Validation error',
  [RedisErrorCode.RETRY_EXHAUSTED]: 'Operation retry attempts exhausted',
  [RedisErrorCode.KEY_TOO_LONG]: 'Redis key exceeds maximum length',
  [RedisErrorCode.INVALID_KEY]: 'Invalid Redis key format',
  [RedisErrorCode.PATTERN_REQUIRED]: 'Pattern is required for this operation',
} as const;

// Redis Metrics Types
export interface RedisMemoryMetrics {
  usedMemory: number;
  peakMemory: number;
  fragmentationRatio: number;
  evictedKeys: number;
  blockedClients: number;
}

export interface RedisConnectionMetrics {
  connectedClients: number;
  blockedClients: number;
  rejectionsPerSecond: number;
  totalConnections: number;
}

export interface RedisOperationsMetrics {
  totalCommands: number;
  opsPerSecond: number;
  keyspaceHits: number;
  keyspaceMisses: number;
  hitRate: number;
}

export interface RedisMetrics {
  memory: RedisMemoryMetrics;
  connection: RedisConnectionMetrics;
  operations: RedisOperationsMetrics;
  timestamp: Date;
}

// Redis State Types
export enum RedisState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  READY = 'ready',
  ERROR = 'error',
  RECONNECTING = 'reconnecting',
}

// Redis Events
export interface RedisEvents {
  'state:change': (state: RedisState) => void;
  'metrics:update': (metrics: RedisMetrics) => void;
  'error': (error: RedisError) => void;
  'memory:warning': (usage: number) => void;
}

// Type Guards
export function isRedisError(error: unknown): error is RedisError {
  return error instanceof RedisError;
}

export function isRedisResult<T>(result: unknown): result is RedisResult<T> {
  return (
    typeof result === 'object' &&
    result !== null &&
    'success' in result &&
    'metadata' in result
  );
}

// Redis Manager Types
export interface IRedisManager extends EventEmitter {
  getState(): RedisState;
  getMetrics(): RedisMetrics;
  getClient(): Promise<Redis | null>;
  shutdown(): Promise<void>;
}

// Export ioredis types
export { Redis, RedisOptions };
