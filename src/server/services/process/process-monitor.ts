import { Server } from 'socket.io';
import { logger } from '../../utils/logger';
import type { Host } from '../../../types/models-shared';
import type { ServerToClientEvents, ClientToServerEvents, InterServerEvents } from '../../../types/socket.io';
import type { ProcessInfo } from '../../../types/metrics';
import type { ProcessCache } from './types';

export class ProcessMonitor {
  private monitoredHosts: Set<string> = new Set();
  private updateInterval = 5000; // 5 seconds
  private intervalId?: NodeJS.Timeout;

  constructor(
    private io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents>,
    private processCache: ProcessCache,
    private listProcesses: (host: Host) => Promise<ProcessInfo[]>,
    private getHost: (hostId: string) => Promise<Host | null>
  ) {}

  /**
   * Start monitoring a host's processes
   */
  async startMonitoringHost(host: Host): Promise<void> {
    this.monitoredHosts.add(host.id);
    await this.updateProcessList(host);

    // Start monitoring if not already started
    if (!this.intervalId) {
      this.startMonitoring();
    }
  }

  /**
   * Stop monitoring a host's processes
   */
  stopMonitoringHost(hostId: string): void {
    this.monitoredHosts.delete(hostId);
    this.processCache.delete(hostId);

    // Stop monitoring if no hosts are being monitored
    if (this.monitoredHosts.size === 0 && this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  /**
   * Start monitoring loop
   */
  private startMonitoring(): void {
    this.intervalId = setInterval(async () => {
      for (const hostId of this.monitoredHosts) {
        try {
          const host = await this.getHost(hostId);
          if (host) {
            await this.updateProcessList(host);
          } else {
            this.stopMonitoringHost(hostId);
          }
        } catch (error) {
          logger.error('Failed to update process list:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            hostId,
          });
          this.io.to(`host:${hostId}`).emit('process:error', {
            hostId,
            error: 'Failed to update process list',
          });
        }
      }
    }, this.updateInterval);
  }

  /**
   * Update process list for a host
   */
  private async updateProcessList(host: Host): Promise<void> {
    try {
      const processes = await this.listProcesses(host);
      const processMap = new Map();

      for (const process of processes) {
        processMap.set(process.pid, process);
      }

      const oldProcesses = this.processCache.get(host.id) || new Map();
      this.processCache.set(host.id, processMap);

      // Emit process list update
      this.io.to(`host:${host.id}`).emit('process:list', {
        hostId: host.id,
        processes,
      });

      // Emit events for process changes
      for (const [pid, process] of processMap) {
        const oldProcess = oldProcesses.get(pid);
        if (!oldProcess) {
          // New process started
          this.io.to(`host:${host.id}`).emit('process:started', {
            hostId: host.id,
            process,
          });
        } else if (oldProcess.status !== process.status) {
          // Process status changed
          this.io.to(`host:${host.id}`).emit('process:changed', {
            hostId: host.id,
            process,
            oldStatus: oldProcess.status,
          });
        } else {
          // Process updated (metrics changed)
          this.io.to(`host:${host.id}`).emit('process:update', {
            hostId: host.id,
            process,
          });
        }
      }

      // Emit events for ended processes
      for (const [pid, oldProcess] of oldProcesses) {
        if (!processMap.has(pid)) {
          this.io.to(`host:${host.id}`).emit('process:ended', {
            hostId: host.id,
            process: oldProcess,
          });
        }
      }

      // Get current timestamp
      const now = new Date();

      // Emit process metrics
      this.io.to(`host:${host.id}`).emit('process:metrics', {
        hostId: host.id,
        metrics: processes.map(p => ({
          pid: p.pid,
          timestamp: now,
          name: p.name,
          command: p.command,
          username: p.username,
          cpuUsage: p.cpuUsage,
          memoryUsage: p.memoryUsage,
          memoryRss: p.memoryRss,
          memoryVms: p.memoryVms,
          threads: p.threads,
          fds: p.fds,
          createdAt: now,
          updatedAt: now,
        })),
      });
    } catch (error) {
      logger.error('Failed to update process list:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId: host.id,
      });
      this.io.to(`host:${host.id}`).emit('process:error', {
        hostId: host.id,
        error: 'Failed to update process list',
      });
    }
  }

  /**
   * Stop monitoring all hosts
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.monitoredHosts.clear();
  }
}
