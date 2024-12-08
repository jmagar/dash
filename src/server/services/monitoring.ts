import os from 'os';
import type { ServiceStatus } from '../types/middleware';
import type { SystemMetrics, ProcessMetrics } from '../../types/metrics.types';
import type { HealthCheckResponse } from '../types/middleware';
import { LoggingManager } from '../managers/LoggingManager';
import { alertsService } from './alerts/alerts.service';

class MonitoringService {
  private static instance: MonitoringService;
  private serviceStatuses: Map<string, ServiceStatus>;
  private checkInterval: NodeJS.Timeout | null;
  private metricsHistory: {
    timestamp: Date;
    metrics: HealthCheckResponse;
  }[];
  private readonly CHECK_INTERVAL_MS = 60000; // 1 minute
  private readonly MAX_HISTORY_LENGTH = 100; // Keep last 100 checks
  private initialized = false;

  private constructor() {
    this.serviceStatuses = new Map();
    this.checkInterval = null;
    this.metricsHistory = [];
  }

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  initialize(): void {
    if (this.initialized) return;
    
    try {
      LoggingManager.getInstance().info('Initializing monitoring service...');
      this.initialized = true;
      LoggingManager.getInstance().info('Monitoring service initialized successfully');
    } catch (error) {
      LoggingManager.getInstance().error('Failed to initialize monitoring service:', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  startMetricsCollection(): void {
    if (this.checkInterval) {
      return;
    }

    void this.collectMetrics();
    this.checkInterval = setInterval(() => {
      void this.collectMetrics();
    }, this.CHECK_INTERVAL_MS);
  }

  private async collectMetrics(): Promise<void> {
    try {
      const metrics = await this.getSystemMetrics();
      const now = new Date();
      this.metricsHistory.push({ timestamp: now, metrics });

      if (this.metricsHistory.length > this.MAX_HISTORY_LENGTH) {
        this.metricsHistory.shift();
      }

      // Get system metrics in the correct format for alerts service
      const systemMetrics: SystemMetrics = {
        hostId: os.hostname(),
        timestamp: now,
        createdAt: now,
        updatedAt: now,
        cpu: {
          total: 0,
          usage: metrics.system.cpu.usage,
          system: 0,
          user: 0,
          idle: 0,
          iowait: 0,
          steal: 0,
          cores: metrics.system.cpu.count,
          threads: metrics.system.cpu.count,
          model: metrics.system.cpu.model
        },
        memory: {
          total: metrics.system.memory.total,
          used: metrics.system.memory.used,
          free: metrics.system.memory.free,
          shared: 0,
          buffers: metrics.system.memory.buffers,
          cached: metrics.system.memory.cached,
          available: metrics.system.memory.available,
          swap_total: metrics.system.memory.swapTotal ?? 0,
          swap_used: metrics.system.memory.swapUsed ?? 0,
          swap_free: metrics.system.memory.swapFree ?? 0,
          usage: (metrics.system.memory.used / metrics.system.memory.total) * 100
        },
        storage: {
          total: metrics.system.disk[0]?.total ?? 0,
          used: metrics.system.disk[0]?.used ?? 0,
          free: metrics.system.disk[0]?.free ?? 0,
          usage: metrics.system.disk[0]?.usedPercent ?? 0,
          ioStats: {
            reads: 0,
            writes: 0,
            readBytes: 0,
            writeBytes: 0,
            readTime: 0,
            writeTime: 0
          },
          mounts: []
        },
        network: {
          interfaces: [],
          bytesSent: 0,
          bytesRecv: 0,
          packetsSent: 0,
          packetsRecv: 0,
          errorsIn: 0,
          errorsOut: 0,
          dropsIn: 0,
          dropsOut: 0,
          tcp_conns: 0,
          udp_conns: 0,
          listen_ports: [],
          total_speed: 0,
          average_speed: 0
        },
        uptime: process.uptime(),
        loadAverage: metrics.system.cpu.loadAverage as [number, number, number]
      };

      // Check metrics against alert rules
      const processMetrics: ProcessMetrics = {
        id: process.pid.toString(),
        pid: process.pid,
        name: process.title ?? 'node',
        command: process.argv[0] ?? 'node',
        status: 'running',
        user: process.env.USERNAME ?? 'unknown',
        cpu: metrics.process.cpuUsage.system,
        cpuUsage: metrics.process.cpuUsage.user + metrics.process.cpuUsage.system,
        memory: metrics.process.memoryUsage.heapUsed,
        memoryUsage: metrics.process.memoryUsage.heapUsed,
        memoryRss: metrics.process.memoryUsage.rss,
        memoryVms: metrics.process.memoryUsage.heapTotal,
        diskRead: 0,
        diskWrite: 0,
        netRead: 0,
        netWrite: 0,
        threads: 0,
        fds: 0,
        started: new Date(),
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await alertsService.checkMetrics(
        os.hostname(),
        systemMetrics,
        [processMetrics]
      );

      LoggingManager.getInstance().debug('System metrics collected');
    } catch (error) {
      LoggingManager.getInstance().error('Failed to collect system metrics:', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined
      });
    }
  }

  private getServiceStatus(service: string): ServiceStatus | undefined {
    return this.serviceStatuses.get(service);
  }

  getDiskUsage(): Promise<Array<{ total: number; free: number; used: number; usedPercent: number }>> {
    return Promise.resolve([{
      total: 1000000,
      free: 500000,
      used: 500000,
      usedPercent: 50
    }]);
  }

  registerService(service: string, status: ServiceStatus): void {
    this.serviceStatuses.set(service, status);
    LoggingManager.getInstance().info('Service registered with status', {
      service,
      status: status.status
    });
  }

  private async getSystemMetrics(): Promise<HealthCheckResponse> {
    const cpuInfo = os.cpus();
    const cpuTimes = cpuInfo[0]?.times ?? { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 };
    const totalCpuTime = Object.values(cpuTimes).reduce((a, b) => a + b, 0);
    const cpuUsage = 1 - (cpuTimes.idle / totalCpuTime);
    const loadAverage = os.loadavg() as [number, number, number];

    return {
      timestamp: new Date(),
      status: 'healthy',
      version: '1.0.0',
      system: {
        cpu: {
          usage: cpuUsage * 100,
          count: cpuInfo.length,
          model: cpuInfo[0]?.model ?? 'Unknown CPU',
          loadAverage
        },
        memory: {
          total: os.totalmem(),
          used: os.totalmem() - os.freemem(),
          free: os.freemem(),
          active: 0,
          available: os.freemem(),
          buffers: 0,
          cached: 0,
          swapTotal: 0,
          swapUsed: 0,
          swapFree: 0
        },
        disk: await this.getDiskUsage(),
        network: []
      },
      process: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        resourceUsage: process.resourceUsage()
      },
      services: Array.from(this.serviceStatuses.entries()).map(([name, status]) => ({
        name,
        status: status.status,
        latency: status.latency,
        error: status.error,
        lastCheck: status.lastCheck,
        metadata: status.metadata
      }))
    };
  }

  stopMetricsCollection(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  getMetricsHistory(): typeof this.metricsHistory {
    return [...this.metricsHistory];
  }

  async getLatestMetrics(): Promise<HealthCheckResponse> {
    try {
      return await this.getSystemMetrics();
    } catch (error) {
      LoggingManager.getInstance().error('Failed to get latest metrics:', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }
}

export const monitoringService = MonitoringService.getInstance();
