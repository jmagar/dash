import { EventEmitter } from 'events';
import { db } from '../db';
import { logger } from '../utils/logger';
import type { SystemMetrics, ProcessMetrics } from '../../types/metrics';

class MetricsService extends EventEmitter {
  private collectionIntervals: Map<string, NodeJS.Timeout> = new Map();
  private cleanupIntervals: Map<string, NodeJS.Timeout> = new Map();

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
          metrics.storage.ioStats?.readCount,
          metrics.storage.ioStats?.writeCount,
          metrics.storage.ioStats?.readBytes,
          metrics.storage.ioStats?.writeBytes,
          metrics.storage.ioStats?.ioTime,
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

      this.emit('metrics', { hostId, metrics });
    } catch (error) {
      logger.error('Failed to store metrics:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
      });
    }
  }

  async storeProcessMetrics(hostId: string, processes: ProcessMetrics[]): Promise<void> {
    try {
      const values = processes.map(p => [
        p.id,
        hostId,
        p.pid,
        p.timestamp,
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
        p.threads,
        p.fds,
        p.createdAt,
        p.updatedAt
      ]);

      const placeholders = values.map((_, i) =>
        `($${i * 18 + 1}, $${i * 18 + 2}, $${i * 18 + 3}, $${i * 18 + 4}, $${i * 18 + 5}, $${i * 18 + 6}, $${i * 18 + 7}, $${i * 18 + 8}, $${i * 18 + 9}, $${i * 18 + 10}, $${i * 18 + 11}, $${i * 18 + 12}, $${i * 18 + 13}, $${i * 18 + 14}, $${i * 18 + 15}, $${i * 18 + 16}, $${i * 18 + 17}, $${i * 18 + 18})`
      ).join(',');

      await db.query(
        `INSERT INTO process_metrics (
          id,
          host_id,
          pid,
          timestamp,
          cpu,
          cpu_usage,
          memory,
          memory_usage,
          memory_rss,
          memory_vms,
          disk_read,
          disk_write,
          net_read,
          net_write,
          threads,
          fds,
          created_at,
          updated_at
        ) VALUES ${placeholders}`,
        values.flat()
      );

      this.emit('process_metrics', { hostId, processes });
    } catch (error) {
      logger.error('Failed to store process metrics:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
      });
    }
  }

  async getMetrics(hostId: string, start: Date, end: Date): Promise<SystemMetrics[]> {
    const result = await db.query<SystemMetrics>(
      `SELECT * FROM system_metrics
       WHERE host_id = $1
       AND timestamp BETWEEN $2 AND $3
       ORDER BY timestamp ASC`,
      [hostId, start, end]
    );

    return result.rows;
  }

  async getProcessMetrics(hostId: string, start: Date, end: Date): Promise<ProcessMetrics[]> {
    const result = await db.query<ProcessMetrics>(
      `SELECT * FROM process_metrics
       WHERE host_id = $1
       AND timestamp BETWEEN $2 AND $3
       ORDER BY timestamp ASC`,
      [hostId, start, end]
    );

    return result.rows;
  }

  async cleanup(): Promise<void> {
    await db.query('SELECT cleanup_old_metrics()');
  }
}

// Export singleton instance
export const metricsService = new MetricsService();
