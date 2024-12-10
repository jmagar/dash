import { BaseEntity } from './base';
import { ServiceStatus } from './status';
import { ServiceEvent } from './events';

export interface MetricsEntity extends BaseEntity {
  hostId: string;
  timestamp: Date;
  system: SystemMetrics;
  processes: ProcessMetrics[];
  status: ServiceStatus;
}

export interface SystemMetrics extends BaseEntity {
  id: string;
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  storage: StorageMetrics;
  network: NetworkMetrics;
  uptime: number;
  loadAverage: [number, number, number];
}

export interface CpuMetrics extends BaseEntity {
  usage: number;
  user: number;
  system: number;
  idle: number;
  iowait: number;
  steal: number;
  cores: number;
  threads: number;
  total: number;
}

export interface MemoryMetrics extends BaseEntity {
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
}

export interface StorageDevice extends BaseEntity {
  name: string;
  mountpoint: string;
  fstype: string;
  total: number;
  used: number;
  free: number;
  usage: number;
  health: number;
}

export interface StorageMetrics extends BaseEntity {
  total: number;
  used: number;
  free: number;
  usage: number;
  devices: StorageDevice[];
  io_stats: StorageIoStats;
  health: number;
}

export interface StorageIoStats extends BaseEntity {
  readBytes: number;
  writeBytes: number;
  readCount: number;
  writeCount: number;
  readTime: number;
  writeTime: number;
  ioTime: number;
}

export interface NetworkMetrics extends BaseEntity {
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
  interfaces: NetworkInterface[];
}

export interface NetworkInterface extends BaseEntity {
  name: string;
  bytesRecv: number;
  bytesSent: number;
  packetsRecv: number;
  packetsSent: number;
  errorsIn: number;
  errorsOut: number;
  dropsIn: number;
  dropsOut: number;
}

export interface ProcessMetrics extends BaseEntity {
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
}

export interface MetricsFilter {
  startTime?: Date;
  endTime?: Date;
  interval?: string;
  metrics?: string[];
  status?: ServiceStatus[];
}

export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary'
}

export type MetricValue = number | string | boolean;

export interface BaseMetric<T = MetricValue> extends BaseEntity {
  value: T;
  timestamp: Date;
  type: MetricType;
  labels?: Record<string, string>;
}

export interface MetricOptions extends BaseEntity {
  name: string;
  description?: string;
  type: MetricType;
  unit?: string;
  threshold?: number;
  critical?: boolean;
}

export interface MetricDefinition extends BaseEntity {
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

export const DEFAULT_METRICS_CONFIG: MetricsConfig = {
  enabled: true,
  interval: 60000, // 1 minute
  retention: 604800000, // 7 days
  thresholds: {
    cpu: 80,
    memory: 80,
    disk: 80,
    latency: 1000
  }
};

export interface MetricEvent extends ServiceEvent {
  type: 'metric:threshold' | 'metric:change' | 'metric:status';
  payload: {
    metric: string;
    previous?: MetricValue;
    current: MetricValue;
    threshold?: number;
    status?: ServiceStatus;
  };
}

// Type guards
export function isMetricType(type: string | undefined): type is MetricType {
  return type !== undefined && Object.values(MetricType).includes(type as MetricType);
}

export function isMetricValue(value: unknown): value is MetricValue {
  return typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean';
}

export function isBaseMetric<T = MetricValue>(metric: unknown): metric is BaseMetric<T> {
  return metric !== null &&
    typeof metric === 'object' &&
    'id' in metric &&
    'value' in metric &&
    'timestamp' in metric &&
    'type' in metric;
}

export function isMetricsEntity(obj: unknown): obj is MetricsEntity {
  return obj !== null &&
    typeof obj === 'object' &&
    'id' in obj &&
    'hostId' in obj &&
    'system' in obj &&
    'processes' in obj &&
    'status' in obj;
}

export function isSystemMetrics(obj: unknown): obj is SystemMetrics {
  return obj !== null &&
    typeof obj === 'object' &&
    'id' in obj &&
    'cpu' in obj &&
    'memory' in obj &&
    'storage' in obj &&
    'network' in obj;
}
