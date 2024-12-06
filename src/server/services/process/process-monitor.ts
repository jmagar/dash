import { Server } from 'socket.io';
import type { Host } from '../../../types/models-shared';
import type { ServerToClientEvents, ClientToServerEvents, InterServerEvents } from '../../../types/socket-events';
import type { ProcessCache } from './types';
import { LoggingManager } from '../../managers/LoggingManager';
import { LoggerAdapter } from '../../utils/logging/logger.adapter';
import type { Logger, LogMetadata } from '../../../types/logger';
import type { HostId, ProcessEventPayload, BaseErrorPayload } from '../../../types/socket.io';
import type { ProcessInfo, ProcessId } from './types';
import { createProcessId } from './types';

export class ProcessMonitor {
  private readonly logger: Logger;
  private monitoredHosts: Set<HostId> = new Set();
  private updateInterval = 5000; // 5 seconds
  private intervalId?: NodeJS.Timeout;

  constructor(
    private io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents>,
    private processCache: ProcessCache,
    private listProcesses: (host: Host) => Promise<ProcessInfo[]>,
    private getHost: (hostId: HostId) => Promise<Host | null>,
    logManager?: LoggingManager
  ) {
    const baseLogger = logManager ?? LoggingManager.getInstance();
    this.logger = new LoggerAdapter(baseLogger, {
      component: 'ProcessMonitor',
      service: 'MonitoringService'
    });

    this.logger.info('ProcessMonitor initialized', {
      updateInterval: this.updateInterval
    });
  }

  /**
   * Start monitoring a host's processes
   */
  async startMonitoringHost(host: Host): Promise<void> {
    const methodLogger = this.logger.withContext({
      operation: 'startMonitoringHost',
      hostId: host.id,
      hostname: host.hostname
    });

    try {
      methodLogger.info('Starting process monitoring for host');
      
      const hostId = host.id as HostId;
      this.monitoredHosts.add(hostId);
      await this.updateProcessList(host);

      // Start monitoring if not already started
      if (!this.intervalId) {
        this.startMonitoring();
      }

      methodLogger.info('Process monitoring started for host', {
        monitoredHostsCount: this.monitoredHosts.size
      });
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error : new Error(String(error)),
        hostId: host.id,
        hostname: host.hostname
      };
      methodLogger.error('Failed to start monitoring host', metadata);
      throw error;
    }
  }

  /**
   * Stop monitoring a host's processes
   */
  stopMonitoringHost(hostId: HostId): void {
    const methodLogger = this.logger.withContext({
      operation: 'stopMonitoringHost',
      hostId
    });

    try {
      methodLogger.info('Stopping process monitoring for host');

      this.monitoredHosts.delete(hostId);
      this.processCache.delete(hostId);

      // Stop monitoring if no hosts are being monitored
      if (this.monitoredHosts.size === 0 && this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = undefined;
        methodLogger.info('Process monitoring stopped - no hosts monitored');
      } else {
        methodLogger.info('Process monitoring stopped for host', {
          remainingHostsCount: this.monitoredHosts.size
        });
      }
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error : new Error(String(error)),
        hostId
      };
      methodLogger.error('Failed to stop monitoring host', metadata);
      throw error;
    }
  }

  /**
   * Start monitoring loop
   */
  private startMonitoring(): void {
    const methodLogger = this.logger.withContext({
      operation: 'startMonitoring',
      component: 'ProcessMonitor'
    });

    methodLogger.info('Starting process monitoring loop', {
      updateInterval: this.updateInterval,
      monitoredHostsCount: this.monitoredHosts.size
    });

    this.intervalId = setInterval(() => {
      void this.monitoringLoop();
    }, this.updateInterval);
  }

  /**
   * Monitoring loop implementation
   */
  private async monitoringLoop(): Promise<void> {
    const methodLogger = this.logger.withContext({
      operation: 'monitoringLoop',
      component: 'ProcessMonitor'
    });

    for (const hostId of this.monitoredHosts) {
      try {
        const host = await this.getHost(hostId);
        if (host) {
          await this.updateProcessList(host);
        } else {
          methodLogger.warn('Host not found, stopping monitoring', { hostId });
          this.stopMonitoringHost(hostId);
        }
      } catch (error) {
        const metadata: LogMetadata = {
          error: error instanceof Error ? error : new Error(String(error)),
          hostId
        };
        methodLogger.error('Failed to update process list', metadata);

        const errorPayload: ProcessEventPayload & BaseErrorPayload = {
          hostId,
          processId: createProcessId(0),
          error: 'Failed to update process list',
          timestamp: new Date().toISOString()
        };
        this.io.to(`host:${hostId}`).emit('process:error', errorPayload);
      }
    }
  }

  /**
   * Update process list for a host
   */
  private async updateProcessList(host: Host): Promise<void> {
    const startTime = Date.now();
    const hostId = host.id as HostId;
    const methodLogger = this.logger.withContext({
      operation: 'updateProcessList',
      hostId: host.id,
      hostname: host.hostname
    });

    try {
      methodLogger.debug('Updating process list');

      const processes = await this.listProcesses(host);
      const processMap = new Map<ProcessId, ProcessInfo>();

      for (const process of processes) {
        processMap.set(process.pid, process);
      }

      const oldProcesses = this.processCache.get(hostId) || new Map<ProcessId, ProcessInfo>();
      this.processCache.set(hostId, processMap);

      // Track process changes
      const changes = {
        new: 0,
        ended: 0,
        statusChanged: 0,
        updated: 0
      };

      const timestamp = new Date().toISOString();

      // Emit process list update
      this.io.to(`host:${hostId}`).emit('process:list', {
        hostId,
        processes,
        timestamp
      });

      // Emit events for process changes
      for (const [pid, process] of processMap) {
        const oldProcess = oldProcesses.get(pid);
        if (!oldProcess) {
          // New process started
          changes.new++;
          this.io.to(`host:${hostId}`).emit('process:started', {
            hostId,
            process,
            timestamp
          });
        } else if (oldProcess.status !== process.status) {
          // Process status changed
          changes.statusChanged++;
          this.io.to(`host:${hostId}`).emit('process:changed', {
            hostId,
            process,
            oldStatus: oldProcess.status,
            timestamp
          });
        } else {
          // Process updated (metrics changed)
          changes.updated++;
          this.io.to(`host:${hostId}`).emit('process:update', {
            hostId,
            process,
            timestamp
          });
        }
      }

      // Emit events for ended processes
      for (const [pid, oldProcess] of oldProcesses) {
        if (!processMap.has(pid)) {
          changes.ended++;
          this.io.to(`host:${hostId}`).emit('process:ended', {
            hostId,
            process: oldProcess,
            timestamp
          });
        }
      }

      // Emit process metrics
      this.io.to(`host:${hostId}`).emit('process:metrics', {
        hostId,
        processes,
        timestamp
      });

      const duration = Date.now() - startTime;
      methodLogger.info('Process list updated', {
        timing: { total: duration },
        stats: {
          total: processes.length,
          changes
        }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const metadata: LogMetadata = {
        error: error instanceof Error ? error : new Error(String(error)),
        hostId: host.id,
        hostname: host.hostname,
        timing: { total: duration }
      };
      methodLogger.error('Failed to update process list', metadata);

      const errorPayload: ProcessEventPayload & BaseErrorPayload = {
        hostId,
        processId: createProcessId(0),
        error: 'Failed to update process list',
        timestamp: new Date().toISOString()
      };
      this.io.to(`host:${hostId}`).emit('process:error', errorPayload);
    }
  }

  /**
   * Stop monitoring all hosts
   */
  stop(): void {
    const methodLogger = this.logger.withContext({
      operation: 'stop',
      component: 'ProcessMonitor'
    });

    try {
      methodLogger.info('Stopping all process monitoring', {
        monitoredHostsCount: this.monitoredHosts.size
      });

      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = undefined;
      }
      this.monitoredHosts.clear();

      methodLogger.info('All process monitoring stopped');
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error : new Error(String(error))
      };
      methodLogger.error('Failed to stop process monitoring', metadata);
      throw error;
    }
  }
}
