import type { EventEmitter } from 'events';

import type { default as Redis } from 'ioredis';
import type { RedisMetrics } from './metrics';
import type { Cache, CacheCommand } from '../../types/cache';
import type { Container, Stack } from '../../types/models-shared';

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
  redis: Redis;
  healthCheck(): Promise<{
    status: string;
    connected: boolean;
    metrics: RedisMetrics;
    error?: string;
  }>;
  disconnect(): Promise<void>;
  cacheSession(token: string, data: string): Promise<void>;
  getSession(token: string): Promise<string | null>;
  deleteSession(token: string): Promise<void>;
  cacheHostStatus(hostId: string, status: Cache.HostStatus): Promise<void>;
  getHostStatus(hostId: string): Promise<Cache.HostStatus | null>;
  invalidateHostCache(hostId: string): Promise<void>;
  cacheDockerContainers(hostId: string, containers: Container[]): Promise<void>;
  getDockerContainers(hostId: string): Promise<Container[]>;
  cacheDockerStacks(hostId: string, stacks: Stack[]): Promise<void>;
  getDockerStacks(hostId: string): Promise<Stack[]>;
  cacheCommand(userId: string, hostId: string, command: CacheCommand | CacheCommand[]): Promise<void>;
  getCommands(userId: string, hostId: string): Promise<CacheCommand[]>;
  getMetrics(): RedisMetrics;
}
