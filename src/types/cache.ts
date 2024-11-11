// eslint-disable-next-line @typescript-eslint/no-var-requires
const Redis = require('ioredis');
export type RedisClient = typeof Redis;

export interface CacheCommand {
  command: string;
  timestamp: Date;
}

export interface CacheKeys {
  SESSION: string;
  USER: string;
  COMMAND: string;
  DOCKER: {
    CONTAINERS: string;
    STACKS: string;
  };
  HOST: string;
  MFA: string;
}

export interface CacheTTL {
  SESSION: number;
  USER: number;
  COMMAND: number;
  DOCKER: number;
  HOST: number;
  MFA: number;
}

export interface Cache {
  redis: RedisClient;
  CACHE_KEYS: CacheKeys;
  CACHE_TTL: CacheTTL;
  cacheSession(token: string, sessionData: string): Promise<void>;
  getSession(token: string): Promise<string | null>;
  healthCheck(): Promise<{ status: string; connected: boolean; error?: string }>;
  isConnected(): boolean;
  getHostStatus(id: string): Promise<unknown>;
  cacheHostStatus(id: string, data: unknown): Promise<void>;
  invalidateHostCache(id: string): Promise<void>;
  getDockerContainers(hostId: string): Promise<unknown>;
  cacheDockerContainers(hostId: string, data: unknown): Promise<void>;
  getDockerStacks(hostId: string): Promise<unknown>;
  cacheDockerStacks(hostId: string, data: unknown): Promise<void>;
  cacheCommand(userId: string, hostId: string, command: CacheCommand | CacheCommand[]): Promise<void>;
  getCommands(userId: string, hostId: string): Promise<CacheCommand[] | null>;
}
