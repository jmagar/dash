export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    user: number;
    system: number;
    idle: number;
    iowait: number;
    steal: number;
    cores: number;
    threads: number;
    total: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    shared: number;
    buffers: number;
    cached: number;
    available: number;
    swap_total: number;
    swap_used: number;
    swap_free: number;
    usage: number;
  };
  storage: {
    total: number;
    used: number;
    free: number;
    usage: number;
    read_bytes: number;
    write_bytes: number;
    read_count: number;
    write_count: number;
    health: string;
    ioStats: {
      readBytes: number;
      writeBytes: number;
      readCount: number;
      writeCount: number;
      readTime: number;
      writeTime: number;
      ioTime: number;
    };
  };
  network: {
    bytesRecv: number;
    bytesSent: number;
    packetsRecv: number;
    packetsSent: number;
    errorsIn: number;
    errorsOut: number;
    dropsIn: number;
    dropsOut: number;
    tx_bytes: number;
    rx_bytes: number;
    tx_packets: number;
    rx_packets: number;
    rx_errors: number;
    tx_errors: number;
    rx_dropped: number;
    tx_dropped: number;
    tcp_conns: number;
    udp_conns: number;
    listen_ports: number;
    average_speed: number;
    total_speed: number;
    health: number;
    interfaces: {
      name: string;
      bytesRecv: number;
      bytesSent: number;
      packetsRecv: number;
      packetsSent: number;
      errorsIn: number;
      errorsOut: number;
      dropsIn: number;
      dropsOut: number;
    }[];
  };
  uptime: number;
  loadAverage: [number, number, number];
  history?: SystemMetrics[];
  createdAt: Date;
  updatedAt: Date;
}

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

export interface MetricsFilter {
  startTime?: Date;
  endTime?: Date;
  interval?: string;
  metrics?: string[];
}

// Metric types
export type MetricType = 'gauge' | 'counter' | 'histogram' | 'summary';
export type MetricValue = number | string | boolean;

export interface BaseMetric<T extends MetricValue = number> {
  value: T;
  timestamp: Date;
  type: MetricType;
  labels?: Record<string, string>;
}

export interface MetricOptions {
  name: string;
  description?: string;
  type: MetricType;
  unit?: string;
  threshold?: number;
  critical?: boolean;
}

// Metric definitions
export interface MetricDefinition {
  name: string;
  help: string;
  type: MetricType;
  labelNames?: string[];
}

export interface MetricsConfig {
  enabled: boolean;
  interval: number;
  retention: number;
  thresholds: {
    cpu: number;
    memory: number;
    disk: number;
    latency: number;
  };
}

// Type guards
export function isMetricType(type: string | undefined): type is MetricType {
  return typeof type === 'string' && ['gauge', 'counter', 'histogram', 'summary'].includes(type);
}

export function isMetricValue(value: unknown): value is MetricValue {
  return typeof value === 'number' ||
         typeof value === 'string' ||
         typeof value === 'boolean';
}

export function isBaseMetric(metric: unknown): metric is BaseMetric {
  if (!metric || typeof metric !== 'object') return false;
  const m = metric as Partial<BaseMetric>;
  
  return isMetricValue(m.value) &&
         m.timestamp instanceof Date &&
         (typeof m.type === 'string' && isMetricType(m.type)) &&
         (m.labels === undefined ||
          (typeof m.labels === 'object' &&
           m.labels !== null &&
           Object.values(m.labels).every(v => typeof v === 'string')));
}

// Default configurations
export const DEFAULT_METRICS_CONFIG: MetricsConfig = {
  enabled: true,
  interval: 60000, // 1 minute
  retention: 86400000, // 24 hours
  thresholds: {
    cpu: 80,      // 80% CPU usage
    memory: 85,   // 85% memory usage
    disk: 90,     // 90% disk usage
    latency: 1000 // 1 second latency
  }
} as const;

// Metric event types
export interface MetricEvent {
  type: 'threshold_exceeded' | 'value_change' | 'status_change';
  timestamp: Date;
  metric: string;
  previous?: MetricValue;
  current: MetricValue;
  details?: Record<string, unknown>;
}

// Metric notification types
export interface MetricNotification {
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  metric: string;
  metadata?: Record<string, unknown>;
}
