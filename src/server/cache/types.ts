import type { EventEmitter } from 'events';
import type { default as Redis } from 'ioredis';
import type { RedisMetrics } from './metrics';
import type { Cache, CacheCommand } from '../../types/cache';
import type { Container, Stack } from '../../types/models-shared';
import type { User } from '../../types/auth';
import type {
  RedisError,
  RedisResult,
  RedisState,
  RedisMetrics as BaseRedisMetrics,
  IRedisManager,
} from './redis-types';

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
