import type { Redis, RedisOptions, RedisError } from './redis';
import type { Container, Stack } from './models-shared';
import type { 
  FileSystemState, 
  ProcessState, 
  NetworkState,
  SystemState 
} from './chatbot';

export interface CacheConfig extends RedisOptions {
  host: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  retryStrategy?: (times: number) => number | null;
  reconnectOnError?: (err: Error) => boolean | 1 | 2;
  enableReadyCheck?: boolean;
  maxRetriesPerRequest?: number | null;
  metrics?: {
    interval: number;
  };
}

export interface CacheError extends Error {
  code: string;
  originalError?: Error;
}

export interface CacheResult<T> {
  success: boolean;
  data?: T;
  error?: CacheError;
}

export interface Cache {
  redis: Redis;
  CACHE_KEYS: CacheKeys;
  CACHE_TTL: CacheTTL;

  // Session management
  cacheSession(token: string, sessionData: string): Promise<CacheResult<void>>;
  getSession(token: string): Promise<CacheResult<string | null>>;
  invalidateSession(token: string): Promise<CacheResult<void>>;
  deleteSession(token: string): Promise<CacheResult<void>>;

  // Connection management
  disconnect(): Promise<CacheResult<void>>;

  // Health check
  healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    connected: boolean;
    error?: string;
    metrics?: {
      memoryUsage: number;
      hitRate: number;
      operations: number;
    };
  }>;

  // Docker management
  getDockerContainers(hostId: string): Promise<CacheResult<Container[]>>;
  cacheDockerContainers(hostId: string, data: Container[]): Promise<CacheResult<void>>;
  getDockerStacks(hostId: string): Promise<CacheResult<Stack[]>>;
  cacheDockerStacks(hostId: string, data: Stack[]): Promise<CacheResult<void>>;

  // Command history
  cacheCommand(userId: string, hostId: string, command: CacheCommand | CacheCommand[]): Promise<CacheResult<void>>;
  getCommands(userId: string, hostId: string): Promise<CacheResult<CacheCommand[] | null>>;

  // Context management
  getFileSystemState(): Promise<CacheResult<Partial<FileSystemState>>>;
  setFileSystemState(state: FileSystemState): Promise<CacheResult<void>>;
  getProcessState(): Promise<CacheResult<Partial<ProcessState>>>;
  setProcessState(state: ProcessState): Promise<CacheResult<void>>;
  getNetworkState(): Promise<CacheResult<Partial<NetworkState>>>;
  setNetworkState(state: NetworkState): Promise<CacheResult<void>>;
  getSystemState(): Promise<CacheResult<Partial<SystemState>>>;
  setSystemState(state: SystemState): Promise<CacheResult<void>>;
}

export interface CacheCommand {
  id: string;
  command: string;
  timestamp: Date;
  userId: string;
  hostId: string;
  exitCode?: number;
  output?: string;
  error?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface CacheKeys {
  SESSION: string;
  COMMAND: string;
  DOCKER: {
    CONTAINERS: string;
    STACKS: string;
  };
}

export interface CacheTTL {
  SESSION: number;
  COMMAND: number;
  DOCKER: {
    CONTAINERS: number;
    STACKS: number;
  };
}

export interface RedisEventMap {
  connect: () => void;
  ready: () => void;
  error: (error: RedisError) => void;
  close: () => void;
  reconnecting: (params: { delay: number; attempt: number }) => void;
  end: () => void;
  warning: (warning: string) => void;
  timeout: () => void;
}

export type RedisEventHandler<K extends keyof RedisEventMap> = RedisEventMap[K];

export interface RedisEvent {
  on<K extends keyof RedisEventMap>(event: K, listener: RedisEventHandler<K>): void;
  off<K extends keyof RedisEventMap>(event: K, listener: RedisEventHandler<K>): void;
  emit<K extends keyof RedisEventMap>(event: K, ...args: Parameters<RedisEventHandler<K>>): boolean;
}
