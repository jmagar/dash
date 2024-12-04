import { EventEmitter } from 'events';
import { db } from '../db';
import { LoggingManager } from '../managers/LoggingManager';
import { 
  SystemMetrics, 
  MetricsConfig
} from '../../types/metrics.types';
import { DBMetric } from '../../types/db-models';

export type MetricName = 
  'cpu' | 'memory' | 'latency' | 
  'errorRate' | 'requestCount' | 
  'activeConnections' | 
  'httpRequestDuration' | 
  'apiErrors' | 
  'operationDuration' | 
  'hostMetrics' | 
  'serviceMetrics' | 
  string;

export interface ServiceMetric {
  timestamp: Date;
  name: MetricName;
  value: number;
  labels?: Record<string, string>;
}

export interface ServiceMetrics {
  cpu: number;
  memory: number;
  latency: number;
  errorRate: number;
  uptime: number;
  requestCount: number;
  activeConnections: number;
  lastError?: Error;
  customMetrics: Record<string, number>;
}

export class MetricsService extends EventEmitter {
  private collectionIntervals: Map<string, NodeJS.Timeout> = new Map();
  private cleanupIntervals: Map<string, NodeJS.Timeout> = new Map();
  private readonly config: Required<MetricsConfig>;
  private metrics: Map<string, ServiceMetrics> = new Map();
  private thresholds: Map<MetricName, number> = new Map();
  private logger: LoggingManager;

  constructor(config: MetricsConfig = {
    collection: { interval: 5000, retention: 86400 },
    alerts: {
      cpu: { warning: 80, critical: 90 },
      memory: { warning: 80, critical: 90 },
      storage: { warning: 80, critical: 90 }
    }
  }) {
    super();
    this.config = {
      collection: {
        interval: config.collection?.interval ?? 5000,
        retention: config.collection?.retention ?? 86400
      },
      alerts: {
        cpu: config.alerts?.cpu ?? { warning: 80, critical: 90 },
        memory: config.alerts?.memory ?? { warning: 80, critical: 90 },
        storage: config.alerts?.storage ?? { warning: 80, critical: 90 }
      }
    };
    this.logger = LoggingManager.getInstance();
    this.initializeDefaultThresholds();
  }

  private initializeDefaultThresholds(): void {
    this.thresholds.set('cpu', 80);
    this.thresholds.set('memory', 90);
    this.thresholds.set('errorRate', 10);
  }

  async storeSystemMetrics(hostId: string, metrics: SystemMetrics): Promise<void> {
    try {
      await db.query(
        `INSERT INTO system_metrics (
          host_id,
          timestamp,
          cpu_total,
          cpu_user,
          cpu_system,
          cpu_idle,
          cpu_iowait,
          cpu_steal,
          cpu_cores,
          cpu_threads,
          memory_total,
          memory_used,
          memory_free,
          memory_shared,
          memory_buffers,
          memory_cached,
          memory_available,
          memory_swap_total
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
        [
          hostId,
          metrics.timestamp,
          metrics.cpu.total,
          metrics.cpu.user,
          metrics.cpu.system,
          metrics.cpu.idle,
          metrics.cpu.iowait,
          metrics.cpu.steal,
          metrics.cpu.cores,
          metrics.cpu.threads,
          metrics.memory.total,
          metrics.memory.used,
          metrics.memory.free,
          metrics.memory.shared,
          metrics.memory.buffers,
          metrics.memory.cached,
          metrics.memory.available,
          metrics.memory.swap_total
        ]
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Error storing system metrics:', { error: errorMessage });
    }
  }

  convertDbMetricToSystemMetric(row: DBMetric): SystemMetrics {
    const interfaces = Array.isArray(row.net_interfaces) ? row.net_interfaces : [];

    return {
      hostId: row.host_id,
      timestamp: row.timestamp,
      cpu: {
        usage: row.cpu_total,
        total: row.cpu_total,
        user: row.cpu_user,
        system: row.cpu_system,
        idle: row.cpu_idle,
        iowait: row.cpu_iowait ?? 0,
        steal: row.cpu_steal ?? 0,
        cores: row.cpu_cores,
        threads: row.cpu_threads,
        model: 'unknown'
      },
      memory: {
        total: row.memory_total,
        used: row.memory_used,
        free: row.memory_free,
        shared: row.memory_shared,
        buffers: row.memory_buffers ?? 0,
        cached: row.memory_cached ?? 0,
        available: row.memory_available,
        swap_total: row.memory_swap_total,
        swap_used: row.memory_swap_used ?? 0,
        swap_free: row.memory_swap_free,
        usage: row.memory_usage
      },
      network: {
        interfaces,
        bytesSent: row.net_bytes_sent,
        bytesRecv: row.net_bytes_recv,
        packetsSent: row.net_packets_sent,
        packetsRecv: row.net_packets_recv,
        errorsIn: row.net_errors_in,
        errorsOut: row.net_errors_out,
        dropsIn: row.net_drops_in,
        dropsOut: row.net_drops_out,
        tcp_conns: row.net_tcp_conns,
        udp_conns: row.net_udp_conns,
        listen_ports: [],
        total_speed: row.net_total_speed,
        average_speed: row.net_average_speed
      },
      storage: {
        total: row.storage_total,
        used: row.storage_used,
        free: row.storage_free,
        usage: row.storage_usage,
        ioStats: {
          reads: row.io_read_count ?? 0,
          writes: row.io_write_count ?? 0,
          readBytes: row.io_read_bytes ?? 0,
          writeBytes: row.io_write_bytes ?? 0,
          readTime: 0,
          writeTime: 0
        },
        mounts: []
      },
      uptime: row.uptime_seconds,
      loadAverage: [
        row.load_average_1,
        row.load_average_5,
        row.load_average_15
      ],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  recordMetric(name: MetricName, value: number, labels?: Record<string, string>): void {
    const timestamp = new Date();
    const metric: ServiceMetric = { timestamp, name, value, labels };
    this.emit('metrics:update', metric);

    const threshold = this.thresholds.get(name);
    if (threshold && value > threshold) {
      this.emit('metrics:threshold', metric);
    }
  }

  getMetrics(serviceName?: string): ServiceMetrics | undefined {
    return serviceName ? this.metrics.get(serviceName) : undefined;
  }

  setThreshold(name: MetricName, threshold: number): void {
    this.thresholds.set(name, threshold);
  }

  startMetricsCollection(serviceName: string, interval = this.config.collection.interval): void {
    const existingInterval = this.collectionIntervals.get(serviceName);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    const newInterval = setInterval(() => {
      const metrics = this.collectServiceMetrics(serviceName);
      this.metrics.set(serviceName, metrics);
    }, interval);

    this.collectionIntervals.set(serviceName, newInterval);
  }

  stopMetricsCollection(serviceName: string): void {
    const interval = this.collectionIntervals.get(serviceName);
    if (interval) {
      clearInterval(interval);
      this.collectionIntervals.delete(serviceName);
    }
  }

  private collectServiceMetrics(_serviceName: string): ServiceMetrics {
    return {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      latency: Math.random() * 1000,
      errorRate: Math.random() * 20,
      uptime: process.uptime(),
      requestCount: Math.floor(Math.random() * 1000),
      activeConnections: Math.floor(Math.random() * 100),
      customMetrics: {}
    };
  }

  cleanup(): void {
    this.collectionIntervals.forEach(clearInterval);
    this.collectionIntervals.clear();
    this.metrics.clear();
  }
}

export const metricsService = new MetricsService();
