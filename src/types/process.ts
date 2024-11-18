export interface ProcessInfo {
  pid: number;
  ppid: number;
  name: string;
  command: string;
  args: string[];
  status: string;
  user: string;
  username: string;
  cpu: number;
  cpuUsage: number;
  memory: number;
  memoryUsage: number;
  memoryRss: number;
  memoryVms: number;
  threads: number;
  fds: number;
  startTime: Date;
  children?: ProcessInfo[];
  ioStats?: {
    readCount: number;
    writeCount: number;
    readBytes: number;
    writeBytes: number;
    ioTime: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessMetrics {
  id: string;
  hostId: string;
  pid: number;
  cpu: number;
  cpuUsage: number;
  memory: number;
  memoryUsage: number;
  memoryRss: number;
  memoryVms: number;
  diskRead: number;
  diskWrite: number;
  netRead: number;
  netWrite: number;
  threads: number;
  fds: number;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessLimits {
  cpuLimit?: number;
  memoryLimit?: number;
  diskReadLimit?: number;
  diskWriteLimit?: number;
  netReadLimit?: number;
  netWriteLimit?: number;
  threadsLimit?: number;
  fdsLimit?: number;
}

export interface ProcessFilter {
  name?: string;
  user?: string;
  status?: string;
  minCpu?: number;
  maxCpu?: number;
  minMemory?: number;
  maxMemory?: number;
  sortBy?: 'cpu' | 'memory' | 'pid' | 'name';
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
  byUser: {
    [key: string]: number;
  };
  byStatus: {
    [key: string]: number;
  };
}

// Ensure ProcessInfo and ProcessMetrics share the same base fields
export type BaseProcessInfo = Pick<ProcessInfo,
  'pid' | 'name' | 'command' | 'status' | 'username' |
  'cpuUsage' | 'memoryUsage' | 'memoryRss' | 'memoryVms' |
  'threads' | 'fds' | 'createdAt' | 'updatedAt'
>;
