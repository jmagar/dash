import { EventEmitter } from 'events';
import { Server } from 'socket.io';
import { logger } from '../utils/logger';
import { agentService } from './agent.service';
import { sshService } from './ssh.service';
import { ApiError } from '../../types/error';
import type { Host, CommandResult } from '../../types/models-shared';
import type { ServerToClientEvents, ClientToServerEvents, InterServerEvents } from '../../types/socket.io';
import { db } from '../db';

export interface ProcessInfo {
  pid: number;
  ppid: number;
  name: string;
  command: string;
  args: string[];
  user: string;
  cpu: number;
  memory: number;
  status: string;
  startTime: Date;
}

export enum ProcessStatus {
  RUNNING = 'running',
  STOPPED = 'stopped',
  ZOMBIE = 'zombie',
  UNKNOWN = 'unknown',
}

class ProcessService extends EventEmitter {
  private processCache: Map<string, Map<number, ProcessInfo>> = new Map();
  private updateInterval = 5000; // 5 seconds
  private monitoredHosts: Set<string> = new Set();
  private io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents>;

  constructor(io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents>) {
    super();
    this.io = io;
    this.startMonitoring();
    this.setupSocketHandlers();
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      socket.on('process:monitor', async ({ hostId }) => {
        try {
          const host = await this.getHost(hostId);
          if (host) {
            await this.startMonitoringHost(host);
            socket.join(`host:${hostId}`);
          }
        } catch (error) {
          logger.error('Failed to start monitoring:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            hostId,
          });
          socket.emit('process:error', {
            hostId,
            error: 'Failed to start monitoring',
          });
        }
      });

      socket.on('process:unmonitor', ({ hostId }) => {
        this.stopMonitoringHost(hostId);
        socket.leave(`host:${hostId}`);
      });

      socket.on('process:kill', async ({ hostId, pid, signal }) => {
        try {
          const host = await this.getHost(hostId);
          if (host) {
            await this.killProcess(host, pid, signal);
          }
        } catch (error) {
          logger.error('Failed to kill process:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            hostId,
            pid,
          });
          socket.emit('process:error', {
            hostId,
            error: 'Failed to kill process',
          });
        }
      });
    });
  }

  /**
   * List processes on a host
   */
  async listProcesses(host: Host): Promise<ProcessInfo[]> {
    try {
      // Try agent first if available
      if (agentService.isConnected(host.id)) {
        return await this.listViaAgent(host.id);
      }

      // Fallback to SSH
      return await this.listViaSSH(host);
    } catch (error) {
      logger.error('Failed to list processes:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId: host.id,
      });
      throw error;
    }
  }

  /**
   * Kill a process on a host
   */
  async killProcess(host: Host, pid: number, signal = 'SIGTERM'): Promise<void> {
    try {
      // Try agent first if available
      if (agentService.isConnected(host.id)) {
        await agentService.executeCommand(host.id, 'kill', ['-' + signal, pid.toString()]);
        return;
      }

      // Fallback to SSH
      await sshService.executeCommand(host, `kill -${signal} ${pid}`);
    } catch (error) {
      logger.error('Failed to kill process:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId: host.id,
        pid,
        signal,
      });
      throw error;
    }
  }

  /**
   * Start monitoring a host's processes
   */
  async startMonitoringHost(host: Host): Promise<void> {
    this.monitoredHosts.add(host.id);
    await this.updateProcessList(host);
  }

  /**
   * Stop monitoring a host's processes
   */
  stopMonitoringHost(hostId: string): void {
    this.monitoredHosts.delete(hostId);
    this.processCache.delete(hostId);
  }

  /**
   * Get cached process info
   */
  getCachedProcesses(hostId: string): ProcessInfo[] | undefined {
    const processes = this.processCache.get(hostId);
    return processes ? Array.from(processes.values()) : undefined;
  }

  /**
   * List processes via agent
   */
  private async listViaAgent(hostId: string): Promise<ProcessInfo[]> {
    return new Promise<ProcessInfo[]>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Process listing timeout'));
      }, 5000);

      // Execute ps command
      agentService.executeCommand(hostId, 'ps', ['-eo', 'pid,ppid,user,%cpu,%mem,stat,start,comm,args']);

      // Wait for command result
      const handler = (data: { agentId: string; result: CommandResult }) => {
        if (data.agentId === hostId) {
          clearTimeout(timeout);
          agentService.removeListener('agent:commandResult', handler);

          if (data.result.status === 'failed') {
            reject(new Error(data.result.stderr || 'Process listing failed'));
          } else {
            resolve(this.parseProcessList(data.result.stdout));
          }
        }
      };

      agentService.on('agent:commandResult', handler);
    });
  }

  /**
   * List processes via SSH
   */
  private async listViaSSH(host: Host): Promise<ProcessInfo[]> {
    const result = await sshService.executeCommand(host, 'ps -eo pid,ppid,user,%cpu,%mem,stat,start,comm,args');
    return this.parseProcessList(result.stdout);
  }

  /**
   * Parse ps command output into process list
   */
  private parseProcessList(output: string): ProcessInfo[] {
    const lines = output.trim().split('\n');
    if (lines.length < 2) return [];

    // Skip header line
    return lines.slice(1).map(line => {
      const parts = line.trim().split(/\s+/);
      const [pid, ppid, user, cpu, mem, stat, start, comm, ...args] = parts;

      return {
        pid: parseInt(pid, 10),
        ppid: parseInt(ppid, 10),
        name: comm,
        command: comm,
        args: args,
        user: user,
        cpu: parseFloat(cpu),
        memory: parseFloat(mem),
        status: this.parseProcessStatus(stat),
        startTime: new Date(start),
      };
    });
  }

  /**
   * Parse process status from ps stat column
   */
  private parseProcessStatus(stat: string): ProcessStatus {
    if (stat.includes('Z')) return ProcessStatus.ZOMBIE;
    if (stat.includes('T')) return ProcessStatus.STOPPED;
    if (stat.includes('R') || stat.includes('S')) return ProcessStatus.RUNNING;
    return ProcessStatus.UNKNOWN;
  }

  /**
   * Start monitoring loop
   */
  private startMonitoring(): void {
    setInterval(async () => {
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
          this.io.to(`host:${host.id}`).emit('process:started', {
            hostId: host.id,
            process,
          });
        } else if (oldProcess.status !== process.status) {
          this.io.to(`host:${host.id}`).emit('process:changed', {
            hostId: host.id,
            process,
            oldStatus: oldProcess.status,
          });
        }
      }

      for (const [pid, oldProcess] of oldProcesses) {
        if (!processMap.has(pid)) {
          this.io.to(`host:${host.id}`).emit('process:ended', {
            hostId: host.id,
            process: oldProcess,
          });
        }
      }
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
   * Get host from database
   */
  private async getHost(hostId: string): Promise<Host | null> {
    const result = await db.query<Host>(
      'SELECT * FROM hosts WHERE id = $1',
      [hostId]
    );
    return result.rows[0] || null;
  }
}

// Export factory function instead of singleton since we need io instance
export const createProcessService = (io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents>) => {
  return new ProcessService(io);
};
