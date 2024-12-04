import type { Redis, RedisOptions } from './redis';
import type { Container, Stack } from './models-shared';
import type { 
  FileSystemState, 
  ProcessState, 
  NetworkState,
  SystemState 
} from './chatbot';
import type { User } from './auth';

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
  healthCheck(): Promise<{
    status: string;
    connected: boolean;
    error?: string;
  }>;

  // Docker management
  getDockerContainers(hostId: string): Promise<Container[]>;
  cacheDockerContainers(hostId: string, data: Container[]): Promise<void>;
  getDockerStacks(hostId: string): Promise<Stack[]>;
  cacheDockerStacks(hostId: string, data: Stack[]): Promise<void>;

  // Command history
  cacheCommand(userId: string, hostId: string, command: CacheCommand | CacheCommand[]): Promise<void>;
  getCommands(userId: string, hostId: string): Promise<CacheCommand[] | null>;

  // Context management
  getFileSystemState(): Promise<Partial<FileSystemState>>;
  setFileSystemState(state: FileSystemState): Promise<void>;
  getProcessState(): Promise<Partial<ProcessState>>;
  setProcessState(state: ProcessState): Promise<void>;
  getNetworkState(): Promise<Partial<NetworkState>>;
  setNetworkState(state: NetworkState): Promise<void>;
  getSystemState(): Promise<Partial<SystemState>>;
  setSystemState(state: SystemState): Promise<void>;
}

export interface CacheCommand {
  command: string;
  timestamp: Date;
  [key: string]: unknown;
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
