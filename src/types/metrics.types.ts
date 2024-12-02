import { BaseEntity } from './base';
import { ServiceStatus } from './status';
import { ServiceEvent } from './events';

export interface SystemMetrics {
  hostId: string;
  cpu: {
    total: number;
    usage: number;
    system: number;
    user: number;
    idle: number;
    iowait: number;
    steal: number;
    cores: number;
    threads: number;
    model: string;
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
    ioStats: {
      reads: number;
      writes: number;
      readBytes: number;
      writeBytes: number;
      readTime: number;
      writeTime: number;
    };
    mounts: {
      device: string;
      mountpoint: string;
      fstype: string;
      total: number;
      used: number;
      free: number;
    }[];
  };
  network: {
    interfaces: NetworkInterface[];
    bytesSent: number;
    bytesRecv: number;
    packetsSent: number;
    packetsRecv: number;
    errorsIn: number;
    errorsOut: number;
    dropsIn: number;
    dropsOut: number;
    tcp_conns: number;
    udp_conns: number;
    listen_ports: number[];
    total_speed: number;
    average_speed: number;
  };
  uptime: number;
  loadAverage: [number, number, number];
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MetricsAlert extends BaseEntity {
  hostId: string;
  type: 'cpu' | 'memory' | 'storage' | 'network';
  status: ServiceStatus;
  threshold: number;
  value: number;
  message: string;
  timestamp: Date;
}

export interface MetricsConfig {
  collection: {
    interval: number;
    retention: number;
  };
  alerts: {
    cpu?: {
      warning: number;
      critical: number;
    };
    memory?: {
      warning: number;
      critical: number;
    };
    storage?: {
      warning: number;
      critical: number;
    };
  };
}

export interface ProcessMetrics {
  id: string;
  pid: number;
  name: string;
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
  status: string;
  command: string;
  user: string;
  threads: number;
  fds: number;
  started: Date;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NetworkInterface {
  name: string;
  mac: string;
  ipv4: string[];
  ipv6: string[];
  rx_bytes: number;
  tx_bytes: number;
  rx_packets: number;
  tx_packets: number;
}

export interface StorageMetrics {
  total: number;
  used: number;
  free: number;
  ioStats?: {
    reads: number;
    writes: number;
    readBytes: number;
    writeBytes: number;
    readTime: number;
    writeTime: number;
  };
  mounts?: StorageMount[];
}

export interface StorageMount {
  device: string;
  mountpoint: string;
  fstype: string;
  total: number;
  used: number;
  free: number;
}

// Type guards
export function isSystemMetrics(obj: unknown): obj is SystemMetrics {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'hostId' in obj &&
    'cpu' in obj &&
    'memory' in obj &&
    'storage' in obj &&
    'network' in obj &&
    'timestamp' in obj
  );
}

export function isMetricsAlert(obj: unknown): obj is MetricsAlert {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'hostId' in obj &&
    'type' in obj &&
    'status' in obj &&
    'threshold' in obj &&
    'value' in obj &&
    'message' in obj &&
    'timestamp' in obj
  );
}
