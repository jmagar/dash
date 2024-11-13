import type { EventEmitter } from 'events';

import type { default as Redis } from 'ioredis';

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
  state: ConnectionState;
  uptime: number;
  memoryUsage: number;
  keyCount: number;
  operationsPerSecond: number;
  lastError?: Error;
}

/**
 * Redis error interface
 */
export interface RedisError extends Error {
  code?: string;
  errno?: number;
  syscall?: string;
  address?: string;
  port?: number;
}

/**
 * Redis client events
 */
export interface RedisClientEvents {
  connect: () => void;
  error: (err: RedisError) => void;
  ready: () => void;
  end: () => void;
  beforeRequest: () => void;
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
  getClient(): Promise<Redis | null>;
  isConnected(): boolean;
  getMetrics(): ConnectionMetrics;
  getState(): ConnectionState;
  shutdown(): Promise<void>;
}

/**
 * Type guard to check if an error is Redis-specific
 */
export function isRedisError(error: unknown): error is RedisError {
  return error instanceof Error && 'code' in error;
}

/**
 * Redis error codes and their descriptions
 */
export const REDIS_ERROR_CODES = {
  ECONNREFUSED: 'Connection refused',
  ECONNRESET: 'Connection reset',
  ETIMEDOUT: 'Connection timed out',
  ENOTFOUND: 'Host not found',
  ECONNABORTED: 'Connection aborted',
} as const;

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
