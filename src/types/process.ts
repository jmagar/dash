import { BaseEntity } from './base';
import { ServiceStatus } from './status';

export interface ProcessEntity extends BaseEntity {
  pid: number;
  ppid: number;
  name: string;
  command: string;
  args: string[];
  status: ServiceStatus;
  user: string;
  username: string;
  hostId: string;
  metrics: ProcessMetrics;
  limits?: ProcessLimits;
  children?: ProcessEntity[];
}

export interface ProcessMetrics extends BaseEntity {
  cpu: number;
  cpuUsage: number;
  memory: number;
  memoryUsage: number;
  memoryRss: number;
  memoryVms: number;
  threads: number;
  fds: number;
  startTime: Date;
  ioStats?: ProcessIoStats;
  timestamp: Date;
}

export interface ProcessIoStats extends BaseEntity {
  readCount: number;
  writeCount: number;
  readBytes: number;
  writeBytes: number;
  ioTime: number;
  diskRead: number;
  diskWrite: number;
  netRead: number;
  netWrite: number;
}

export interface ProcessLimits extends BaseEntity {
  cpuLimit?: number;
  memoryLimit?: number;
  diskReadLimit?: number;
  diskWriteLimit?: number;
  netReadLimit?: number;
  netWriteLimit?: number;
  fdLimit?: number;
  threadLimit?: number;
}

export interface ProcessFilter {
  name?: string;
  user?: string;
  status?: ServiceStatus;
  minCpu?: number;
  maxCpu?: number;
  minMemory?: number;
  maxMemory?: number;
  sortBy?: keyof ProcessMetrics;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ProcessStats {
  total: number;
  running: number;
  sleeping: number;
  stopped: number;
  zombie: number;
  byUser: Record<string, number>;
  byStatus: Record<ServiceStatus, number>;
  byHost: Record<string, number>;
}

// Type guards
export function isProcessEntity(obj: unknown): obj is ProcessEntity {
  return obj !== null &&
    typeof obj === 'object' &&
    'id' in obj &&
    'pid' in obj &&
    'name' in obj &&
    'status' in obj &&
    'metrics' in obj;
}

export function isProcessMetrics(obj: unknown): obj is ProcessMetrics {
  return obj !== null &&
    typeof obj === 'object' &&
    'id' in obj &&
    'cpu' in obj &&
    'memory' in obj &&
    'timestamp' in obj;
}

export function isProcessIoStats(obj: unknown): obj is ProcessIoStats {
  return obj !== null &&
    typeof obj === 'object' &&
    'id' in obj &&
    'readCount' in obj &&
    'writeCount' in obj;
}

export function isProcessLimits(obj: unknown): obj is ProcessLimits {
  return obj !== null &&
    typeof obj === 'object' &&
    'id' in obj &&
    ('cpuLimit' in obj || 'memoryLimit' in obj || 'diskReadLimit' in obj || 'diskWriteLimit' in obj || 'netReadLimit' in obj || 'netWriteLimit' in obj || 'fdLimit' in obj || 'threadLimit' in obj);
}
