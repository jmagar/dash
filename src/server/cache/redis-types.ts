import type { EventEmitter } from 'events';
import type { default as Redis } from 'ioredis';
import type { LogMetadata } from '../../types/logger';
import type { RedisMetrics } from './metrics';

// Re-export all Redis types from the main types file
export * from '../../types/redis';

/**
 * Redis error codes
 */
export enum RedisErrorCode {
  INVALID_CONFIG = 'INVALID_CONFIG',
  NOT_CONNECTED = 'NOT_CONNECTED',
  OPERATION_ERROR = 'OPERATION_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
}

/**
 * Redis error options interface
 */
export interface RedisErrorOptions {
  code: RedisErrorCode;
  message: string;
  metadata?: LogMetadata;
  cause?: Error;
  syscall?: string;
  address?: string;
  port?: number;
}

/**
 * Unified Redis error class
 */
export class RedisError extends Error {
  public readonly code: RedisErrorCode;
  public readonly metadata?: LogMetadata;
  public readonly cause?: Error;
  public readonly syscall?: string;
  public readonly address?: string;
  public readonly port?: number;

  constructor(options: RedisErrorOptions) {
    super(options.message);
    this.name = 'RedisError';
    this.code = options.code;
    this.metadata = options.metadata;
    this.cause = options.cause;
    this.syscall = options.syscall;
    this.address = options.address;
    this.port = options.port;
  }
}

/**
 * Redis connection states
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

/**
 * Redis connection metrics
 */
export interface ConnectionMetrics {
  memory: {
    used: number;
    peak: number;
    fragmentation: number;
    limit: number;
  };
  keys: number;
  hits: number;
  misses: number;
  hitRate: number;
  connectedClients: number;
  operationsPerSecond: number;
  lastUpdate: Date;
}

/**
 * Redis manager events
 */
export interface RedisManagerEvents {
  'state:change': (state: ConnectionState) => void;
  'metrics:update': (metrics: ConnectionMetrics) => void;
  'error': (error: RedisError) => void;
}

/**
 * Redis manager interface
 */
export interface IRedisManager extends EventEmitter {
  getState(): ConnectionState;
  getMetrics(): ConnectionMetrics;
  getClient(): Promise<Redis | null>;
  shutdown(): Promise<void>;
}

/**
 * Type guard to check if an error is Redis-specific
 */
export function isRedisError(error: unknown): error is RedisError {
  return error instanceof RedisError;
}

/**
 * Redis operation result type
 */
export type RedisResult<T> = {
  success: boolean;
  data?: T;
  error?: RedisError;
  metadata?: {
    duration: number;
    retries: number;
    [key: string]: unknown;
  };
};

/**
 * Error factory functions
 */
export function createConnectionError(error: unknown): RedisError {
  if (error instanceof Error) {
    return new RedisError({
      code: RedisErrorCode.CONNECTION_ERROR,
      message: 'Failed to connect to Redis',
      cause: error,
      metadata: { error: error.message },
    });
  }
  return new RedisError({
    code: RedisErrorCode.CONNECTION_ERROR,
    message: 'Failed to connect to Redis',
    metadata: { error: String(error) },
  });
}

export function createAuthenticationError(error: unknown): RedisError {
  if (error instanceof Error) {
    return new RedisError({
      code: RedisErrorCode.AUTHENTICATION_ERROR,
      message: 'Redis authentication failed',
      cause: error,
      metadata: { error: error.message },
    });
  }
  return new RedisError({
    code: RedisErrorCode.AUTHENTICATION_ERROR,
    message: 'Redis authentication failed',
    metadata: { error: String(error) },
  });
}

/**
 * Standard error messages
 */
export const REDIS_ERROR_MESSAGES = {
  [RedisErrorCode.INVALID_CONFIG]: 'Invalid Redis configuration',
  [RedisErrorCode.NOT_CONNECTED]: 'Redis client is not connected',
  [RedisErrorCode.OPERATION_ERROR]: 'Redis operation failed',
  [RedisErrorCode.CONNECTION_ERROR]: 'Failed to connect to Redis',
  [RedisErrorCode.AUTHENTICATION_ERROR]: 'Redis authentication failed',
} as const;
