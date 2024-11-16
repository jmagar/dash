import { EventEmitter } from 'events';
import { db } from '../db';
import { logger } from '../utils/logger';
import type { SystemMetrics, ProcessMetrics } from '../../types/process-metrics';

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
          net_connections,
          net_tcp_conns,
          net_udp_conns,
          net_listen_ports,
          net_interfaces,
          net_total_speed,
          net_average_speed,
          uptime_seconds,
          load_average_1,
          load_average_5,
          load_average_15
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49)`,
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
          metrics.memory.swapTotal,
          metrics.memory.swapUsed,
          metrics.memory.swapFree,
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
          metrics.network.connections,
          metrics.network.tcpConns,
          metrics.network.udpConns,
          metrics.network.listenPorts,
          metrics.network.interfaces,
          metrics.network.totalSpeed,
          metrics.network.averageSpeed,
          metrics.uptimeSeconds,
          metrics.loadAverage[0],
          metrics.loadAverage[1],
          metrics.loadAverage[2]
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
        hostId,
        p.pid,
        p.timestamp,
        p.name,
        p.command,
        p.username,
        p.cpuUsage,
        p.memoryUsage,
        p.memoryRss,
        p.memoryVms,
        p.threads,
        p.fds,
        p.ioStats?.readCount,
        p.ioStats?.writeCount,
        p.ioStats?.readBytes,
        p.ioStats?.writeBytes,
      ]);

      const placeholders = values.map((_, i) => 
        `($${i * 16 + 1}, $${i * 16 + 2}, $${i * 16 + 3}, $${i * 16 + 4}, $${i * 16 + 5}, $${i * 16 + 6}, $${i * 16 + 7}, $${i * 16 + 8}, $${i * 16 + 9}, $${i * 16 + 10}, $${i * 16 + 11}, $${i * 16 + 12}, $${i * 16 + 13}, $${i * 16 + 14}, $${i * 16 + 15}, $${i * 16 + 16})`
      ).join(',');

      await db.query(
        `INSERT INTO process_metrics (
          host_id,
          pid,
          timestamp,
          name,
          command,
          username,
          cpu_usage,
          memory_usage,
          memory_rss,
          memory_vms,
          threads,
          fds,
          io_read_count,
          io_write_count,
          io_read_bytes,
          io_write_bytes
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
    const result = await db.query(
      `SELECT * FROM system_metrics 
       WHERE host_id = $1 
       AND timestamp BETWEEN $2 AND $3 
       ORDER BY timestamp ASC`,
      [hostId, start, end]
    );

    return result.rows.map(row => ({
      timestamp: row.timestamp,
      cpu: {
        user: row.cpu_user,
        system: row.cpu_system,
        idle: row.cpu_idle,
        iowait: row.cpu_iowait,
        steal: row.cpu_steal,
        total: row.cpu_total,
        cores: row.cpu_cores,
        threads: row.cpu_threads,
      },
      memory: {
        total: row.memory_total,
        used: row.memory_used,
        free: row.memory_free,
        shared: row.memory_shared,
        buffers: row.memory_buffers,
        cached: row.memory_cached,
        available: row.memory_available,
        swapTotal: row.memory_swap_total,
        swapUsed: row.memory_swap_used,
        swapFree: row.memory_swap_free,
        usage: row.memory_usage,
      },
      storage: {
        total: row.storage_total,
        used: row.storage_used,
        free: row.storage_free,
        usage: row.storage_usage,
        ioStats: row.io_read_count ? {
          readCount: row.io_read_count,
          writeCount: row.io_write_count,
          readBytes: row.io_read_bytes,
          writeBytes: row.io_write_bytes,
          ioTime: row.io_time,
        } : undefined,
      },
      network: {
        bytesSent: row.net_bytes_sent,
        bytesRecv: row.net_bytes_recv,
        packetsSent: row.net_packets_sent,
        packetsRecv: row.net_packets_recv,
        errorsIn: row.net_errors_in,
        errorsOut: row.net_errors_out,
        dropsIn: row.net_drops_in,
        dropsOut: row.net_drops_out,
        connections: row.net_connections,
        tcpConns: row.net_tcp_conns,
        udpConns: row.net_udp_conns,
        listenPorts: row.net_listen_ports,
        interfaces: row.net_interfaces,
        totalSpeed: row.net_total_speed,
        averageSpeed: row.net_average_speed,
      },
      uptimeSeconds: row.uptime_seconds,
      loadAverage: [row.load_average_1, row.load_average_5, row.load_average_15],
    }));
  }

  async getProcessMetrics(hostId: string, start: Date, end: Date): Promise<ProcessMetrics[]> {
    const result = await db.query(
      `SELECT * FROM process_metrics 
       WHERE host_id = $1 
       AND timestamp BETWEEN $2 AND $3 
       ORDER BY timestamp ASC`,
      [hostId, start, end]
    );

    return result.rows.map(row => ({
      pid: row.pid,
      timestamp: row.timestamp,
      name: row.name,
      command: row.command,
      username: row.username,
      cpuUsage: row.cpu_usage,
      memoryUsage: row.memory_usage,
      memoryRss: row.memory_rss,
      memoryVms: row.memory_vms,
      threads: row.threads,
      fds: row.fds,
      ioStats: row.io_read_count ? {
        readCount: row.io_read_count,
        writeCount: row.io_write_count,
        readBytes: row.io_read_bytes,
        writeBytes: row.io_write_bytes,
      } : undefined,
    }));
  }

  async cleanup(): Promise<void> {
    await db.query('SELECT cleanup_old_metrics()');
  }
}

export const metricsService = new MetricsService();
