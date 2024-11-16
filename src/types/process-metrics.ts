export interface SystemMetrics {
  timestamp: Date;
  cpu: CPUMetrics;
  memory: MemoryMetrics;
  storage: StorageMetrics;
  network: NetMetrics;
  loadAverage: [number, number, number];
  uptimeSeconds: number;
  cpuUsage: number;
  memoryTotal: number;
  memoryUsed: number;
  diskTotal: number;
  diskUsed: number;
}

export interface CPUMetrics {
  user: number;
  system: number;
  idle: number;
  iowait?: number;
  steal?: number;
  total: number;
  cores: number;
  threads: number;
}

export interface MemoryMetrics {
  total: number;
  used: number;
  free: number;
  shared: number;
  buffers?: number;
  cached?: number;
  available: number;
  swapTotal: number;
  swapUsed: number;
  swapFree: number;
  usage: number;
}

export interface StorageMetrics {
  ioStats?: IOMetrics;
  total: number;
  used: number;
  free: number;
  usage: number;
}

export interface IOMetrics {
  readCount: number;
  writeCount: number;
  readBytes: number;
  writeBytes: number;
  ioTime?: number;
}

export interface NetMetrics {
  bytesSent: number;
  bytesRecv: number;
  packetsSent: number;
  packetsRecv: number;
  errorsIn: number;
  errorsOut: number;
  dropsIn: number;
  dropsOut: number;
  connections: number;
  tcpConns: number;
  udpConns: number;
  listenPorts: number;
  interfaces: number;
  totalSpeed: number;
  averageSpeed: number;
}

export interface MetricsConfig {
  collectionInterval: number;  // Milliseconds between collections
  retentionPeriod: number;    // Hours to keep metrics
  includeIO: boolean;         // Whether to collect I/O metrics
  includeNetwork: boolean;    // Whether to collect network metrics
  includeExtended: boolean;   // Whether to collect extended metrics
  processFilter?: {
    names?: string[];         // Process names to include
    users?: string[];         // Users to include
    minCpu?: number;          // Minimum CPU % to include
    minMemory?: number;       // Minimum memory % to include
  };
}

export interface MetricsSummary {
  startTime: Date;
  endTime: Date;
  processes: {
    total: number;
    running: number;
    sleeping: number;
    stopped: number;
    zombie: number;
  };
  system: {
    cpuUsage: number;
    memoryUsage: number;
    swapUsage: number;
    diskUsage: number;
    loadAverage: [number, number, number];
  };
  topProcesses: {
    byCpu: Array<{
      pid: number;
      name: string;
      cpuPercentage: number;
    }>;
    byMemory: Array<{
      pid: number;
      name: string;
      memoryPercentage: number;
    }>;
    byIo?: Array<{
      pid: number;
      name: string;
      ioBytes: number;
    }>;
  };
}

// Event types for real-time updates
export interface MetricsEvent {
  hostId: string;
  metrics: SystemMetrics;
  timestamp: Date;
}

export interface MetricsThreshold {
  cpu?: {
    warning: number;   // Percentage
    critical: number;  // Percentage
  };
  memory?: {
    warning: number;   // Percentage
    critical: number;  // Percentage
  };
  disk?: {
    warning: number;   // Percentage
    critical: number;  // Percentage
  };
  swap?: {
    warning: number;   // Percentage
    critical: number;  // Percentage
  };
  load?: {
    warning: number;   // Load average threshold
    critical: number;  // Load average threshold
  };
}

export interface MetricsAlert {
  hostId: string;
  type: 'cpu' | 'memory' | 'disk' | 'swap' | 'load';
  level: 'warning' | 'critical';
  value: number;
  threshold: number;
  message: string;
  timestamp: Date;
}
