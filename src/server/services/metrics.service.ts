import { EventEmitter } from 'events';
import { db } from '../db';
import { LoggingManager } from '../managers/utils/LoggingManager';
import { getAgentService } from './agent.service';
import { 
  SystemMetrics, 
  ProcessMetrics, 
  NetworkInterface, 
  MetricsAlert,
  StorageMetrics,
  StorageMount,
  isSystemMetrics,
  isMetricsAlert,
  MetricsConfig
} from '../../types/metrics.types';
import { ServiceStatus } from '../../types/status';
import type { LogMetadata } from '../../types/logger';
import type { AgentMetrics } from '../../types/socket-events';

class MetricsService extends EventEmitter {
  private collectionIntervals: Map<string, NodeJS.Timeout> = new Map();
  private cleanupIntervals: Map<string, NodeJS.Timeout> = new Map();
  private readonly config: MetricsConfig;

  constructor(config: MetricsConfig) {
    super();
    this.config = config;
  }

  async storeMetrics(hostId: string, metrics: SystemMetrics): Promise<void> {
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
          memory_swap_total,
          memory_swap_used,
          memory_swap_free,
          memory_usage,
          storage_total,
          storage_used,
          storage_free,
          storage_usage,
          io_read_count,
          io_write_count,
          io_read_bytes,
          io_write_bytes,
          io_time,
          net_bytes_sent,
          net_bytes_recv,
          net_packets_sent,
          net_packets_recv,
          net_errors_in,
          net_errors_out,
          net_drops_in,
          net_drops_out,
          net_tcp_conns,
          net_udp_conns,
          net_listen_ports,
          net_interfaces,
          net_total_speed,
          net_average_speed,
          uptime,
          load_average_1,
          load_average_5,
          load_average_15,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
          $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38,
          $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50)`,
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
          metrics.memory.swap_total,
          metrics.memory.swap_used,
          metrics.memory.swap_free,
          metrics.memory.usage,
          metrics.storage.total,
          metrics.storage.used,
          metrics.storage.free,
          metrics.storage.usage,
          metrics.storage.ioStats?.reads,
          metrics.storage.ioStats?.writes,
          metrics.storage.ioStats?.readBytes,
          metrics.storage.ioStats?.writeBytes,
          metrics.storage.ioStats?.readTime,
          metrics.storage.ioStats?.writeTime,
          metrics.network.bytesSent,
          metrics.network.bytesRecv,
          metrics.network.packetsSent,
          metrics.network.packetsRecv,
          metrics.network.errorsIn,
          metrics.network.errorsOut,
          metrics.network.dropsIn,
          metrics.network.dropsOut,
          metrics.network.tcp_conns,
          metrics.network.udp_conns,
          metrics.network.listen_ports,
          metrics.network.interfaces,
          metrics.network.total_speed,
          metrics.network.average_speed,
          metrics.uptime,
          metrics.loadAverage[0],
          metrics.loadAverage[1],
          metrics.loadAverage[2],
          metrics.createdAt,
          metrics.updatedAt
        ]
      );

      await this.handleHostStatus(hostId, metrics);

      this.emit('metrics', { hostId, metrics });
    } catch (error) {
      LoggingManager.getInstance().error('Failed to store metrics:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
      });
    }
  }

  private async handleHostStatus(hostId: string, metrics: SystemMetrics): Promise<void> {
    try {
      interface HostStatus {
        status: string;
      }
      const host = await db.query<HostStatus>('SELECT status FROM hosts WHERE id = $1', [hostId]);
      if (!host.rows[0]) return;

      const currentStatus = host.rows[0].status;
      let newStatus = currentStatus;

      // Don't update status if host is in installing state
      if (currentStatus !== 'installing') {
        if (metrics.cpu.total > 95 || metrics.memory.usage > 95) {
          newStatus = 'error';
        } else {
          newStatus = 'online';
        }

        if (currentStatus !== newStatus) {
          await db.query('UPDATE hosts SET status = $1 WHERE id = $2', [newStatus, hostId]);
        }
      }
    } catch (error) {
      LoggingManager.getInstance().error('Failed to update host status', { 
        error: error instanceof Error ? error : new Error(String(error)),
        hostId 
      });
    }
  }

  private getSystemStatus(metrics: unknown): ServiceStatus {
    try {
      if (metrics && typeof metrics === 'object' && 'status' in metrics) {
        const { status } = metrics as { status: unknown };
        if (typeof status === 'string' && Object.values(ServiceStatus).includes(status as ServiceStatus)) {
          return status as ServiceStatus;
        }
      }
      return ServiceStatus.INACTIVE;
    } catch (error) {
      LoggingManager.getInstance().error('Failed to get system status', { 
        error: error instanceof Error ? error : new Error(String(error))
      });
      return ServiceStatus.ERROR;
    }
  }

  collectNetworkMetrics(hostId: string): NetworkInterface[] {
    try {
      const agentService = getAgentService();
      const agent = agentService.getAgent(hostId);
      if (!agent?.metrics?.network) {
        throw new Error('No network metrics available');
      }

      // Ensure we return an array of NetworkInterface
      const networkInterfaces: unknown[] = Array.isArray(agent.metrics.network) ? agent.metrics.network : [];
      
      // Type guard for NetworkInterface
      const isNetworkInterface = (iface: unknown): iface is NetworkInterface => {
        return typeof iface === 'object' && iface !== null &&
          'name' in iface && typeof iface.name === 'string' &&
          'mac' in iface && typeof iface.mac === 'string' &&
          'ipv4' in iface && Array.isArray(iface.ipv4) &&
          'ipv6' in iface && Array.isArray(iface.ipv6);
      };

      return networkInterfaces.filter(isNetworkInterface);
    } catch (error) {
      LoggingManager.getInstance().error('Failed to collect network metrics', { 
        error: error instanceof Error ? error : new Error(String(error)),
        hostId 
      });
      return [];
    }
  }

  collectStorageMetrics(hostId: string): StorageMetrics {
    try {
      const agentService = getAgentService();
      const agent = agentService.getAgent(hostId);
      if (!agent?.metrics?.storage) {
        throw new Error('No storage metrics available');
      }

      // Type guard for StorageMetrics
      const isStorageMetrics = (metrics: unknown): metrics is StorageMetrics => {
        return typeof metrics === 'object' && metrics !== null &&
          'total' in metrics && typeof metrics.total === 'number' &&
          'used' in metrics && typeof metrics.used === 'number' &&
          'free' in metrics && typeof metrics.free === 'number';
      };

      if (!isStorageMetrics(agent.metrics.storage)) {
        throw new Error('Invalid storage metrics format');
      }

      return agent.metrics.storage;
    } catch (error) {
      LoggingManager.getInstance().error('Failed to collect storage metrics', { 
        error: error instanceof Error ? error : new Error(String(error)),
        hostId 
      });
      return {
        total: 0,
        used: 0,
        free: 0,
        mounts: []
      };
    }
  }

  async storeProcessMetrics(hostId: string, processes: ProcessMetrics[]): Promise<void> {
    try {
      // Validate input array
      const validProcesses = processes.filter((p): p is ProcessMetrics => {
        return typeof p === 'object' && p !== null &&
          'pid' in p && typeof p.pid === 'number' &&
          'name' in p && typeof p.name === 'string' &&
          'cpu' in p && typeof p.cpu === 'number' &&
          'memory' in p && typeof p.memory === 'number';
      });

      if (validProcesses.length === 0) {
        LoggingManager.getInstance().warn('No valid process metrics to store', { hostId });
        return;
      }

      const values = validProcesses.map(p => [
        hostId,
        p.id,
        p.pid,
        p.name,
        p.cpu,
        p.cpuUsage,
        p.memory,
        p.memoryUsage,
        p.memoryRss,
        p.memoryVms,
        p.diskRead,
        p.diskWrite,
        p.netRead,
        p.netWrite,
        p.status,
        p.command,
        p.user,
        p.threads,
        p.started,
        p.updatedAt
      ]);

      await db.query(
        `INSERT INTO process_metrics (
          host_id, id, pid, name, cpu, cpu_usage, memory, memory_usage,
          memory_rss, memory_vms, disk_read, disk_write, net_read, net_write,
          status, command, user, threads, started, updated_at
        ) VALUES ${values.map((_, i) => 
          `($${i * 20 + 1}, $${i * 20 + 2}, $${i * 20 + 3}, $${i * 20 + 4},
            $${i * 20 + 5}, $${i * 20 + 6}, $${i * 20 + 7}, $${i * 20 + 8},
            $${i * 20 + 9}, $${i * 20 + 10}, $${i * 20 + 11}, $${i * 20 + 12},
            $${i * 20 + 13}, $${i * 20 + 14}, $${i * 20 + 15}, $${i * 20 + 16},
            $${i * 20 + 17}, $${i * 20 + 18}, $${i * 20 + 19}, $${i * 20 + 20})`
        ).join(', ')}`,
        values.flat()
      );
    } catch (error) {
      LoggingManager.getInstance().error('Failed to store process metrics', { 
        error: error instanceof Error ? error : new Error(String(error)),
        hostId 
      });
    }
  }

  async getMetrics(hostId: string, start: Date, end: Date): Promise<SystemMetrics[]> {
    try {
      const result = await db.query<SystemMetrics>(
        `SELECT * FROM system_metrics
         WHERE host_id = $1
         AND timestamp BETWEEN $2 AND $3
         ORDER BY timestamp ASC`,
        [hostId, start, end]
      );

      // Validate each row
      return result.rows.filter((row): row is SystemMetrics => {
        return isSystemMetrics(row);
      });
    } catch (error) {
      LoggingManager.getInstance().error('Failed to get metrics', { 
        error: error instanceof Error ? error : new Error(String(error)),
        hostId 
      });
      return [];
    }
  }

  async getProcessMetrics(hostId: string, start: Date, end: Date): Promise<ProcessMetrics[]> {
    try {
      const result = await db.query<ProcessMetrics>(
        `SELECT * FROM process_metrics
         WHERE host_id = $1
         AND timestamp BETWEEN $2 AND $3
         ORDER BY timestamp ASC`,
        [hostId, start, end]
      );

      // Validate each row has required fields
      return result.rows.filter((row): row is ProcessMetrics => {
        return typeof row === 'object' && row !== null &&
          'pid' in row && typeof row.pid === 'number' &&
          'name' in row && typeof row.name === 'string' &&
          'cpu' in row && typeof row.cpu === 'number' &&
          'memory' in row && typeof row.memory === 'number';
      });
    } catch (error) {
      LoggingManager.getInstance().error('Failed to get process metrics', { 
        error: error instanceof Error ? error : new Error(String(error)),
        hostId 
      });
      return [];
    }
  }

  async createMetricsAlert(alert: Omit<MetricsAlert, 'id' | 'createdAt' | 'updatedAt'>): Promise<MetricsAlert> {
    const now = new Date();
    const newAlert: MetricsAlert = {
      ...alert,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now
    };
    
    await db.query(
      `INSERT INTO metrics_alerts (
        id,
        host_id,
        type,
        status,
        threshold,
        value,
        message,
        timestamp,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        newAlert.id,
        newAlert.hostId,
        newAlert.type,
        newAlert.status,
        newAlert.threshold,
        newAlert.value,
        newAlert.message,
        newAlert.timestamp,
        newAlert.createdAt,
        newAlert.updatedAt
      ]
    );

    return newAlert;
  }

  async getMetricsAlerts(hostId: string): Promise<MetricsAlert[]> {
    try {
      const result = await db.query(
        'SELECT * FROM metrics_alerts WHERE host_id = $1 ORDER BY timestamp DESC',
        [hostId]
      );
      return result.rows.filter((row): row is MetricsAlert => {
        return isMetricsAlert(row);
      });
    } catch (error) {
      LoggingManager.getInstance().error('Failed to get metrics alerts', { 
        error: error instanceof Error ? error : new Error(String(error)),
        hostId 
      });
      throw error;
    }
  }

  private async processMetricsAlert(metrics: SystemMetrics): Promise<void> {
    try {
      const alerts: Omit<MetricsAlert, 'id' | 'createdAt' | 'updatedAt'>[] = [];
      const now = new Date();

      // Type guard for alert thresholds
      const isValidThreshold = (threshold: unknown): threshold is { warning: number; critical: number } => {
        return typeof threshold === 'object' && threshold !== null &&
          'warning' in threshold && typeof threshold.warning === 'number' &&
          'critical' in threshold && typeof threshold.critical === 'number';
      };

      // CPU alerts
      if (isValidThreshold(this.config.alerts?.cpu)) {
        if (metrics.cpu.usage >= this.config.alerts.cpu.critical) {
          alerts.push({
            hostId: metrics.hostId,
            type: 'cpu',
            status: ServiceStatus.ERROR,
            threshold: this.config.alerts.cpu.critical,
            value: metrics.cpu.usage,
            message: `CPU usage exceeded critical threshold: ${metrics.cpu.usage}%`,
            timestamp: now
          });
        } else if (metrics.cpu.usage >= this.config.alerts.cpu.warning) {
          alerts.push({
            hostId: metrics.hostId,
            type: 'cpu',
            status: ServiceStatus.DEGRADED,
            threshold: this.config.alerts.cpu.warning,
            value: metrics.cpu.usage,
            message: `CPU usage exceeded warning threshold: ${metrics.cpu.usage}%`,
            timestamp: now
          });
        }
      }

      // Memory alerts
      if (isValidThreshold(this.config.alerts?.memory)) {
        if (metrics.memory.usage >= this.config.alerts.memory.critical) {
          alerts.push({
            hostId: metrics.hostId,
            type: 'memory',
            status: ServiceStatus.ERROR,
            threshold: this.config.alerts.memory.critical,
            value: metrics.memory.usage,
            message: `Memory usage exceeded critical threshold: ${metrics.memory.usage}%`,
            timestamp: now
          });
        } else if (metrics.memory.usage >= this.config.alerts.memory.warning) {
          alerts.push({
            hostId: metrics.hostId,
            type: 'memory',
            status: ServiceStatus.DEGRADED,
            threshold: this.config.alerts.memory.warning,
            value: metrics.memory.usage,
            message: `Memory usage exceeded warning threshold: ${metrics.memory.usage}%`,
            timestamp: now
          });
        }
      }

      // Storage alerts
      if (isValidThreshold(this.config.alerts?.storage)) {
        if (metrics.storage.usage >= this.config.alerts.storage.critical) {
          alerts.push({
            hostId: metrics.hostId,
            type: 'storage',
            status: ServiceStatus.ERROR,
            threshold: this.config.alerts.storage.critical,
            value: metrics.storage.usage,
            message: `Storage usage exceeded critical threshold: ${metrics.storage.usage}%`,
            timestamp: now
          });
        } else if (metrics.storage.usage >= this.config.alerts.storage.warning) {
          alerts.push({
            hostId: metrics.hostId,
            type: 'storage',
            status: ServiceStatus.DEGRADED,
            threshold: this.config.alerts.storage.warning,
            value: metrics.storage.usage,
            message: `Storage usage exceeded warning threshold: ${metrics.storage.usage}%`,
            timestamp: now
          });
        }
      }

      // Create all alerts
      await Promise.all(alerts.map(alert => this.createMetricsAlert(alert)));
    } catch (error) {
      LoggingManager.getInstance().error('Failed to process metrics alert', { 
        error: error instanceof Error ? error : new Error(String(error)),
        metrics 
      });
    }
  }

  async cleanup(): Promise<void> {
    await db.query('SELECT cleanup_old_metrics()');
  }
}

// Export singleton instance
export const metricsService = new MetricsService({} as MetricsConfig);


