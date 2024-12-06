import type { SystemMetrics } from './process-metrics';

/**
 * Database metric record structure
 */
export interface DBMetric {
  id: string;
  host_id: string;
  timestamp: Date;

  // CPU metrics
  cpu_total: number;
  cpu_user: number;
  cpu_system: number;
  cpu_idle: number;
  cpu_iowait?: number;
  cpu_steal?: number;
  cpu_cores: number;
  cpu_threads: number;

  // Memory metrics
  memory_total: number;
  memory_used: number;
  memory_free: number;
  memory_shared: number;
  memory_buffers?: number;
  memory_cached?: number;
  memory_available: number;
  memory_swap_total: number;
  memory_swap_used: number;
  memory_swap_free: number;
  memory_usage: number;

  // Storage metrics
  storage_total: number;
  storage_used: number;
  storage_free: number;
  storage_usage: number;

  // IO metrics
  io_read_count?: number;
  io_write_count?: number;
  io_read_bytes?: number;
  io_write_bytes?: number;
  io_time?: number;

  // Network metrics
  net_bytes_sent: number;
  net_bytes_recv: number;
  net_packets_sent: number;
  net_packets_recv: number;
  net_errors_in: number;
  net_errors_out: number;
  net_drops_in: number;
  net_drops_out: number;
  net_connections: number;
  net_tcp_conns: number;
  net_udp_conns: number;
  net_listen_ports: number;
  net_interfaces: number;
  net_total_speed: number;
  net_average_speed: number;

  // System info
  uptime_seconds: number;
  load_average_1: number;
  load_average_5: number;
  load_average_15: number;

  metadata?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

// Error types
export class MetricValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: unknown,
    public readonly constraint?: string
  ) {
    super(message);
    this.name = 'MetricValidationError';
  }
}

// Constants
export const METRIC_CONSTRAINTS = {
  CPU: {
    MIN: 0,
    MAX: 100,
    CORES_MIN: 1,
    CORES_MAX: 1024,
  },
  MEMORY: {
    MIN: 0,
    USAGE_MAX: 100,
  },
  NETWORK: {
    MIN: 0,
    MAX_PORTS: 65535,
  },
  LOAD: {
    MIN: 0,
    WARNING: 10,
    CRITICAL: 20,
  },
} as const;

// Type guards
export function isDBMetric(obj: unknown): obj is DBMetric {
  if (!obj || typeof obj !== 'object') return false;
  
  const metric = obj as DBMetric;
  return (
    typeof metric.id === 'string' &&
    typeof metric.host_id === 'string' &&
    metric.timestamp instanceof Date &&
    typeof metric.cpu_total === 'number' &&
    typeof metric.memory_total === 'number' &&
    typeof metric.storage_total === 'number' &&
    typeof metric.net_bytes_sent === 'number' &&
    typeof metric.uptime_seconds === 'number'
  );
}

// Validation functions
export function validateCPUMetrics(metric: DBMetric): void {
  if (metric.cpu_total < METRIC_CONSTRAINTS.CPU.MIN || metric.cpu_total > METRIC_CONSTRAINTS.CPU.MAX) {
    throw new MetricValidationError(
      'Invalid CPU total usage',
      'cpu_total',
      metric.cpu_total,
      `${METRIC_CONSTRAINTS.CPU.MIN}-${METRIC_CONSTRAINTS.CPU.MAX}`
    );
  }

  if (metric.cpu_cores < METRIC_CONSTRAINTS.CPU.CORES_MIN || metric.cpu_cores > METRIC_CONSTRAINTS.CPU.CORES_MAX) {
    throw new MetricValidationError(
      'Invalid CPU cores count',
      'cpu_cores',
      metric.cpu_cores,
      `${METRIC_CONSTRAINTS.CPU.CORES_MIN}-${METRIC_CONSTRAINTS.CPU.CORES_MAX}`
    );
  }
}

export function validateMemoryMetrics(metric: DBMetric): void {
  if (metric.memory_usage < METRIC_CONSTRAINTS.MEMORY.MIN || metric.memory_usage > METRIC_CONSTRAINTS.MEMORY.USAGE_MAX) {
    throw new MetricValidationError(
      'Invalid memory usage percentage',
      'memory_usage',
      metric.memory_usage,
      `${METRIC_CONSTRAINTS.MEMORY.MIN}-${METRIC_CONSTRAINTS.MEMORY.USAGE_MAX}`
    );
  }

  if (metric.memory_total < METRIC_CONSTRAINTS.MEMORY.MIN) {
    throw new MetricValidationError(
      'Invalid total memory',
      'memory_total',
      metric.memory_total,
      `>=${METRIC_CONSTRAINTS.MEMORY.MIN}`
    );
  }
}

/**
 * Convert database metric to system metric format
 */
export function dbMetricToSystemMetric(dbMetric: DBMetric): SystemMetrics {
  return {
    timestamp: dbMetric.timestamp,
    cpuUsage: dbMetric.cpu_total,
    cpu: {
      total: dbMetric.cpu_total,
      user: dbMetric.cpu_user,
      system: dbMetric.cpu_system,
      idle: dbMetric.cpu_idle,
      iowait: dbMetric.cpu_iowait ?? 0,
      steal: dbMetric.cpu_steal ?? 0,
      cores: dbMetric.cpu_cores,
      threads: dbMetric.cpu_threads,
    },
    memory: {
      total: dbMetric.memory_total,
      used: dbMetric.memory_used,
      free: dbMetric.memory_free,
      shared: dbMetric.memory_shared,
      buffers: dbMetric.memory_buffers ?? 0,
      cached: dbMetric.memory_cached ?? 0,
      available: dbMetric.memory_available,
      swapTotal: dbMetric.memory_swap_total,
      swapUsed: dbMetric.memory_swap_used,
      swapFree: dbMetric.memory_swap_free,
      usage: dbMetric.memory_usage,
    },
    storage: {
      total: dbMetric.storage_total,
      used: dbMetric.storage_used,
      free: dbMetric.storage_free,
      usage: dbMetric.storage_usage,
      ioStats: dbMetric.io_read_count ? {
        readCount: dbMetric.io_read_count,
        writeCount: dbMetric.io_write_count ?? 0,
        readBytes: dbMetric.io_read_bytes ?? 0,
        writeBytes: dbMetric.io_write_bytes ?? 0,
        ioTime: dbMetric.io_time ?? 0,
      } : undefined,
    },
    network: {
      bytesSent: dbMetric.net_bytes_sent,
      bytesRecv: dbMetric.net_bytes_recv,
      packetsSent: dbMetric.net_packets_sent,
      packetsRecv: dbMetric.net_packets_recv,
      errorsIn: dbMetric.net_errors_in,
      errorsOut: dbMetric.net_errors_out,
      dropsIn: dbMetric.net_drops_in,
      dropsOut: dbMetric.net_drops_out,
      connections: dbMetric.net_connections,
      tcpConns: dbMetric.net_tcp_conns,
      udpConns: dbMetric.net_udp_conns,
      listenPorts: dbMetric.net_listen_ports,
      interfaces: dbMetric.net_interfaces,
      totalSpeed: dbMetric.net_total_speed,
      averageSpeed: dbMetric.net_average_speed,
    },
    uptimeSeconds: dbMetric.uptime_seconds,
    loadAverage: [
      dbMetric.load_average_1,
      dbMetric.load_average_5,
      dbMetric.load_average_15,
    ],
    diskTotal: dbMetric.storage_total,
    diskUsed: dbMetric.storage_used,
    diskFree: dbMetric.storage_free,
  };
}

/**
 * Convert system metric to database metric format
 */
export function systemMetricToDbMetric(metric: SystemMetrics, hostId: string): Omit<DBMetric, 'id' | 'created_at' | 'updated_at'> {
  const ioStats = metric.storage.ioStats ?? {
    readCount: 0,
    writeCount: 0,
    readBytes: 0,
    writeBytes: 0,
    ioTime: 0
  };

  // Safely extract load averages with defaults
  const loadAverage = Array.isArray(metric.loadAverage) ? metric.loadAverage : [0, 0, 0];
  const [load1 = 0, load5 = 0, load15 = 0] = loadAverage;

  return {
    host_id: hostId,
    timestamp: metric.timestamp,
    cpu_total: metric.cpu.total,
    cpu_user: metric.cpu.user,
    cpu_system: metric.cpu.system,
    cpu_idle: metric.cpu.idle,
    cpu_iowait: metric.cpu.iowait ?? 0,
    cpu_steal: metric.cpu.steal ?? 0,
    cpu_cores: metric.cpu.cores,
    cpu_threads: metric.cpu.threads,
    memory_total: metric.memory.total,
    memory_used: metric.memory.used,
    memory_free: metric.memory.free,
    memory_shared: metric.memory.shared,
    memory_buffers: metric.memory.buffers ?? 0,
    memory_cached: metric.memory.cached ?? 0,
    memory_available: metric.memory.available,
    memory_swap_total: metric.memory.swapTotal,
    memory_swap_used: metric.memory.swapUsed,
    memory_swap_free: metric.memory.swapFree,
    memory_usage: metric.memory.usage,
    storage_total: metric.storage.total,
    storage_used: metric.storage.used,
    storage_free: metric.storage.free,
    storage_usage: metric.storage.usage,
    io_read_count: ioStats.readCount,
    io_write_count: ioStats.writeCount,
    io_read_bytes: ioStats.readBytes,
    io_write_bytes: ioStats.writeBytes,
    io_time: ioStats.ioTime,
    net_bytes_sent: metric.network.bytesSent,
    net_bytes_recv: metric.network.bytesRecv,
    net_packets_sent: metric.network.packetsSent,
    net_packets_recv: metric.network.packetsRecv,
    net_errors_in: metric.network.errorsIn,
    net_errors_out: metric.network.errorsOut,
    net_drops_in: metric.network.dropsIn,
    net_drops_out: metric.network.dropsOut,
    net_connections: metric.network.connections,
    net_tcp_conns: metric.network.tcpConns,
    net_udp_conns: metric.network.udpConns,
    net_listen_ports: metric.network.listenPorts,
    net_interfaces: metric.network.interfaces,
    net_total_speed: metric.network.totalSpeed,
    net_average_speed: metric.network.averageSpeed,
    uptime_seconds: metric.uptimeSeconds,
    load_average_1: load1,
    load_average_5: load5,
    load_average_15: load15,
  };
}
