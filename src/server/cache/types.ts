import type { EventEmitter } from 'events';

import type { default as Redis } from 'ioredis';
import type { RedisMetrics } from './metrics';
import type { Cache, CacheCommand } from '../../types/cache';
import type { Container, Stack } from '../../types/models-shared';
import type { User } from '../../types/auth';

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
  return error instanceof Error && 'code' in error;
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
 * Cache service interface
 */
export interface ICacheService {
  // Health Check and Management
  healthCheck(): Promise<{
    status: string;
    connected: boolean;
    metrics: RedisMetrics;
    error?: string;
  }>;
  disconnect(): Promise<void>;
  getMetrics(): RedisMetrics;

  // Session Management
  getSession(token: string): Promise<string | null>;
  setSession(token: string, user: User, refreshToken: string): Promise<void>;
  removeSession(token: string): Promise<void>;

  // Host Management
  getHost(id: string): Promise<string | null>;
  setHost(id: string, data: string): Promise<void>;
  removeHost(id: string): Promise<void>;

  // Docker Management
  getContainers(hostId: string): Promise<Container[] | null>;
  setContainers(hostId: string, containers: Container[]): Promise<void>;
  removeContainers(hostId: string): Promise<void>;
  getStacks(hostId: string): Promise<Stack[] | null>;
  setStacks(hostId: string, stacks: Stack[]): Promise<void>;
  removeStacks(hostId: string): Promise<void>;

  // Command Management
  getCommand(id: string): Promise<string | null>;
  setCommand(id: string, data: string): Promise<void>;
  removeCommand(id: string): Promise<void>;

  // Cache Management
  clear(): Promise<void>;
}
