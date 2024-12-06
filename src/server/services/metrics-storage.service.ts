import { db } from '../db';
import { LoggingManager } from '../managers/LoggingManager';
import type { SystemMetrics } from '../../types/metrics.types';
import type { DBMetric } from '../../types/db-models';
import type { Host } from '../../types/models-shared';

class MetricsStorageService {
  /**
   * Convert DB metric to system metric
   */
  private dbToSystemMetric(row: DBMetric): SystemMetrics {
    // Parse network interfaces from JSON string or default to empty array
    const interfaces = Array.isArray(row.net_interfaces) ? row.net_interfaces :
      (typeof row.net_interfaces === 'string' ?
        JSON.parse(row.net_interfaces) :
        [{
          name: 'default',
          bytesRecv: 0,
          bytesSent: 0,
          packetsRecv: 0,
          packetsSent: 0,
          errorsIn: 0,
          errorsOut: 0,
          dropsIn: 0,
          dropsOut: 0
        }]
      );

    return {
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
        swap_used: row.memory_swap_used,
        swap_free: row.memory_swap_free,
        usage: row.memory_usage,
      },
      storage: {
        total: row.storage_total,
        used: row.storage_used,
        free: row.storage_free,
        usage: row.storage_usage,
        read_bytes: row.io_read_bytes ?? 0,
        write_bytes: row.io_write_bytes ?? 0,
        read_count: row.io_read_count ?? 0,
        write_count: row.io_write_count ?? 0,
        health: 'unknown',
        ioStats: {
          readBytes: row.io_read_bytes ?? 0,
          writeBytes: row.io_write_bytes ?? 0,
          readCount: row.io_read_count ?? 0,
          writeCount: row.io_write_count ?? 0,
          readTime: 0,
          writeTime: 0,
          ioTime: row.io_time ?? 0,
        },
      },
      network: {
        bytesRecv: row.net_bytes_recv,
        bytesSent: row.net_bytes_sent,
        packetsRecv: row.net_packets_recv,
        packetsSent: row.net_packets_sent,
        errorsIn: row.net_errors_in,
        errorsOut: row.net_errors_out,
        dropsIn: row.net_drops_in,
        dropsOut: row.net_drops_out,
        tx_bytes: row.net_bytes_sent,
        rx_bytes: row.net_bytes_recv,
        tx_packets: row.net_packets_sent,
        rx_packets: row.net_packets_recv,
        rx_errors: row.net_errors_in,
        tx_errors: row.net_errors_out,
        rx_dropped: row.net_drops_in,
        tx_dropped: row.net_drops_out,
        tcp_conns: row.net_tcp_conns,
        udp_conns: row.net_udp_conns,
        listen_ports: row.net_listen_ports,
        average_speed: row.net_average_speed,
        total_speed: row.net_total_speed,
        health: 0,
        interfaces,
      },
      uptime: row.uptime_seconds,
      loadAverage: [
        row.load_average_1,
        row.load_average_5,
        row.load_average_15,
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Store system metrics
   */
  async storeMetrics(host: Host, metrics: SystemMetrics): Promise<void> {
    try {
      const result = await db.query<DBMetric>(
        `INSERT INTO metrics (
          host_id, timestamp, cpu_total, cpu_user, cpu_system, cpu_idle,
          cpu_iowait, cpu_steal, cpu_cores, cpu_threads, memory_total,
          memory_used, memory_free, memory_shared, memory_buffers,
          memory_cached, memory_available, memory_swap_total,
          memory_swap_used, memory_swap_free, memory_usage,
          storage_total, storage_used, storage_free, storage_usage,
          io_read_count, io_write_count, io_read_bytes, io_write_bytes,
          io_time, net_bytes_sent, net_bytes_recv, net_packets_sent,
          net_packets_recv, net_errors_in, net_errors_out, net_drops_in,
          net_drops_out, net_tcp_conns, net_udp_conns,
          net_listen_ports, net_interfaces, net_total_speed,
          net_average_speed, uptime_seconds, load_average_1,
          load_average_5, load_average_15
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
          $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38,
          $39, $40, $41, $42, $43, $44, $45, $46, $47, $48
        ) RETURNING *`,
        [
          host.id,
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
          metrics.storage.ioStats.readCount,
          metrics.storage.ioStats.writeCount,
          metrics.storage.ioStats.readBytes,
          metrics.storage.ioStats.writeBytes,
          metrics.storage.ioStats.ioTime,
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
          JSON.stringify(metrics.network.interfaces),
          metrics.network.total_speed,
          metrics.network.average_speed,
          metrics.uptime,
          metrics.loadAverage[0],
          metrics.loadAverage[1],
          metrics.loadAverage[2],
        ]
      );

      LoggingManager.getInstance().info('Stored metrics:', {
        hostId: host.id,
        metricsId: result.rows[0].id,
      });
    } catch (error) {
      LoggingManager.getInstance().error('Failed to store metrics:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId: host.id,
      });
      throw error;
    }
  }

  /**
   * Get historical metrics for a host
   */
  async getHistoricalMetrics(
    host: Host,
    startTime: Date,
    endTime: Date
  ): Promise<SystemMetrics[]> {
    try {
      const result = await db.query<DBMetric>(
        `SELECT * FROM metrics
        WHERE host_id = $1
          AND timestamp >= $2
          AND timestamp <= $3
        ORDER BY timestamp ASC`,
        [host.id, startTime, endTime]
      );

      return result.rows.map(row => this.dbToSystemMetric(row));
    } catch (error) {
      LoggingManager.getInstance().error('Failed to get historical metrics:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId: host.id,
      });
      throw error;
    }
  }

  /**
   * Get latest metrics for a host
   */
  async getLatestMetrics(host: Host): Promise<SystemMetrics | null> {
    try {
      const result = await db.query<DBMetric>(
        `SELECT * FROM metrics
        WHERE host_id = $1
        ORDER BY timestamp DESC
        LIMIT 1`,
        [host.id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.dbToSystemMetric(result.rows[0]);
    } catch (error) {
      LoggingManager.getInstance().error('Failed to get latest metrics:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId: host.id,
      });
      throw error;
    }
  }
}

// Export singleton instance
export const metricsStorageService = new MetricsStorageService();
