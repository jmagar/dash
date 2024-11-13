
export interface Cache {
  redis: RedisClient;
  CACHE_KEYS: CacheKeys;
  CACHE_TTL: CacheTTL;

  // Session management
  cacheSession(token: string, sessionData: string): Promise<void>;
  getSession(token: string): Promise<string | null>;
  invalidateSession(token: string): Promise<void>;

  // Health check
  healthCheck(): Promise<{ status: string; connected: boolean; error?: string }>;

  // Host management
  getHostStatus(id: string): Promise<unknown>;
  cacheHostStatus(id: string, data: unknown): Promise<void>;
  invalidateHostCache(id: string): Promise<void>;

  // Docker management
  getDockerContainers(hostId: string): Promise<unknown>;
  cacheDockerContainers(hostId: string, data: unknown): Promise<void>;
  getDockerStacks(hostId: string): Promise<unknown>;
  cacheDockerStacks(hostId: string, data: unknown): Promise<void>;

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
  DOCKER: number;
}

export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, duration?: number): Promise<'OK' | null>;
  del(key: string): Promise<number>;
  lpush(key: string, ...values: string[]): Promise<number>;
  lrange(key: string, start: number, stop: number): Promise<string[]>;
  expire(key: string, seconds: number): Promise<number>;
  shutdown(): Promise<void>;
  on(event: string, listener: (...args: any[]) => void): void;
  quit(): Promise<'OK' | null>;
  ping(): Promise<string>;
}
