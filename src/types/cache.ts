import type Redis from 'ioredis';
import type { Container, Stack } from './models-shared';

export interface Cache {
  redis: Redis;
  CACHE_KEYS: CacheKeys;
  CACHE_TTL: CacheTTL;

  // Session management
  cacheSession(token: string, sessionData: string): Promise<void>;
  getSession(token: string): Promise<string | null>;
  invalidateSession(token: string): Promise<void>;
  deleteSession(token: string): Promise<void>;

  // Connection management
  disconnect(): Promise<void>;

  // Health check
  healthCheck(): Promise<{ status: string; connected: boolean; error?: string }>;

  // Host management
  getHostStatus(id: string): Promise<unknown>;
  cacheHostStatus(id: string, data: unknown): Promise<void>;
  invalidateHostCache(id: string): Promise<void>;

  // Docker management
  getDockerContainers(hostId: string): Promise<Container[]>;
  cacheDockerContainers(hostId: string, data: Container[]): Promise<void>;
  getDockerStacks(hostId: string): Promise<Stack[]>;
  cacheDockerStacks(hostId: string, data: Stack[]): Promise<void>;

  // Command history
  cacheCommand(userId: string, hostId: string, command: CacheCommand | CacheCommand[]): Promise<void>;
  getCommands(userId: string, hostId: string): Promise<CacheCommand[] | null>;
}

export interface CacheCommand {
  command: string;
  timestamp: Date;
  [key: string]: unknown;
}

export interface CacheKeys {
  SESSION: string;
  HOST: string;
  COMMAND: string;
  DOCKER: {
    CONTAINERS: string;
    STACKS: string;
  };
}

export interface CacheTTL {
  SESSION: number;
  HOST: number;
  COMMAND: number;
  DOCKER: {
    CONTAINERS: number;
    STACKS: number;
  };
}

export interface RedisEvent {
  connect: () => void;
  ready: () => void;
  error: (error: Error) => void;
  close: () => void;
  reconnecting: (params: { delay: number; attempt: number }) => void;
  end: () => void;
  warning: (warning: string) => void;
  timeout: () => void;
}
