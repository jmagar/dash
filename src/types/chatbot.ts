import type { ConnectionState } from '../server/cache/types';
import type { Host, Container, Stack } from './models-shared';
import type { ServiceContext } from '../server/services/base.service';

export interface FileSystemState {
  currentDirectory: string;
  recentFiles: Array<{
    path: string;
    lastAccessed: Date;
    size: number;
  }>;
  watchedDirectories: Array<{
    path: string;
    lastChange: Date;
  }>;
  mountPoints: Array<{
    path: string;
    usage: {
      total: number;
      used: number;
      available: number;
    };
  }>;
}

export interface DockerState {
  containers: Array<{
    id: string;
    name: string;
    status: string;
    image: string;
    ports: string[];
    created: Date;
    state: string;
  }>;
  images: Array<{
    id: string;
    tags: string[];
    size: number;
    created: Date;
  }>;
  networks: Array<{
    id: string;
    name: string;
    driver: string;
  }>;
  volumes: Array<{
    name: string;
    mountpoint: string;
    driver: string;
  }>;
  stacks: Stack[];
}

export interface LogState {
  recentLogs: Array<{
    timestamp: Date;
    level: string;
    message: string;
    metadata?: Record<string, unknown>;
  }>;
  errorCount: {
    last1h: number;
    last24h: number;
    total: number;
  };
  logFiles: Array<{
    path: string;
    size: number;
    lastModified: Date;
  }>;
}

export interface ProcessState {
  running: Array<{
    pid: number;
    command: string;
    cpu: number;
    memory: number;
    started: Date;
  }>;
  systemLoad: {
    '1m': number;
    '5m': number;
    '15m': number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    cached: number;
  };
}

export interface NetworkState {
  connections: Array<{
    local: string;
    remote: string;
    state: string;
    pid?: number;
  }>;
  interfaces: Array<{
    name: string;
    addresses: string[];
    stats: {
      bytesIn: number;
      bytesOut: number;
      packetsIn: number;
      packetsOut: number;
    };
  }>;
}

export interface SystemState {
  cacheStatus: {
    connected: boolean;
    state: ConnectionState;
    memoryUsage: number;
    totalKeys: number;
  };
  dbStatus: {
    connected: boolean;
    poolSize: number;
    activeConnections: number;
  };
  activeHosts: Host[];
  metrics: {
    systemLoad: number;
    memoryUsage: number;
    activeUsers: number;
  };
  fileSystem: FileSystemState;
  docker: DockerState;
  logs: LogState;
  processes: ProcessState;
  network: NetworkState;
}

export interface ChatbotContext {
  serviceContext: ServiceContext;
  systemState: SystemState;
  lastQuery?: {
    timestamp: Date;
    query: string;
    result: unknown;
  };
  metadata: Record<string, unknown>;
}

export interface ContextProvider {
  getCurrentContext(): Promise<ChatbotContext>;
  updateContext(partial: Partial<ChatbotContext>): void;
  clearContext(): void;
}
