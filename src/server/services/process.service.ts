import { EventEmitter } from 'events';
import { Server } from 'socket.io';
import { logger } from '../utils/logger';
import { agentService } from './agent.service';
import { sshService } from './ssh.service';
import { ApiError } from '../../types/error';
import type { Host, CommandResult } from '../../types/models-shared';
import type { ServerToClientEvents, ClientToServerEvents, InterServerEvents } from '../../types/socket.io';
import { db } from '../db';
import type { ProcessInfo } from '../../types/metrics';

enum ProcessStatus {
  RUNNING = 'running',
  STOPPED = 'stopped',
  SLEEPING = 'sleeping',
  ZOMBIE = 'zombie',
  DEAD = 'dead',
  UNKNOWN = 'unknown',
}

interface ProcessInfo {
  pid: number;
  ppid: number;
  name: string;
  command: string;
  args: string[];
  username: string;
  user: string;
  cpuUsage: number;
  memoryUsage: number;
  cpu: number;
  memory: number;
  status: ProcessStatus;
  startTime: Date;
  threads: number;
  fds: number;
  memoryRss: number;
  memoryVms: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ProcessMetrics {
  pid: number;
  name: string;
  command: string;
  username: string;
  cpuUsage: number;
  memoryUsage: number;
  memoryRss: number;
  memoryVms: number;
  threads: number;
  fds: number;
  ioStats?: {
    readCount: number;
    writeCount: number;
    readBytes: number;
    writeBytes: number;
    ioTime: number;
  };
  createdAt: Date;
  updatedAt: Date;
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
      await this.executeCommand(host, `kill -${signal} ${pid}`);
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
    const output = await this.executeCommand(
      host,
      'ps -eo pid,user,pcpu,pmem,vsz,rss,tty,stat,start,time,comm --no-headers'
    );

    return output
      .trim()
      .split('\n')
      .map(line => {
        const [
          pid,
          username,
          cpuUsage,
          memoryUsage,
          vms,
          rss,
          _tty,
          status,
          _start,
          _time,
          command,
        ] = line.trim().split(/\s+/);

        return {
          pid: parseInt(pid, 10),
          name: command,
          command,
          username,
          status: this.parseProcessStatus(status),
          cpuUsage: parseFloat(cpuUsage),
          memoryUsage: parseFloat(memoryUsage),
          memoryRss: parseInt(rss, 10) * 1024, // Convert KB to bytes
          memoryVms: parseInt(vms, 10) * 1024, // Convert KB to bytes
          threads: 0, // Will be populated by getProcessDetails
          fds: 0, // Will be populated by getProcessDetails
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });
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
        threads: 0,
        fds: 0,
        memoryRss: 0,
        memoryVms: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });
  }

  /**
   * Parse process status from ps stat column
   */
  private parseProcessStatus(stat: string): ProcessStatus {
    switch (stat.charAt(0)) {
      case 'R':
        return ProcessStatus.RUNNING;
      case 'S':
        return ProcessStatus.SLEEPING;
      case 'T':
        return ProcessStatus.STOPPED;
      case 'Z':
        return ProcessStatus.ZOMBIE;
      case 'X':
        return ProcessStatus.DEAD;
      default:
        return ProcessStatus.UNKNOWN;
    }
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

  private async executeCommand(host: Host, command: string): Promise<string> {
    const result = await sshService.executeCommand(host.id, command);
    if (result.code !== 0) {
      throw new Error(`Command failed: ${result.stderr}`);
    }
    return result.stdout;
  }

  async getProcessDetails(host: Host, pid: number): Promise<Partial<ProcessInfo>> {
    try {
      const [threadsOutput, fdsOutput] = await Promise.all([
        this.executeCommand(host, `ls /proc/${pid}/task | wc -l`),
        this.executeCommand(host, `ls /proc/${pid}/fd | wc -l`),
      ]);

      return {
        threads: parseInt(threadsOutput.trim(), 10),
        fds: parseInt(fdsOutput.trim(), 10),
      };
    } catch (error) {
      logger.error('Failed to get process details:', {
        hostId: host.id,
        pid,
        error: error instanceof Error ? error.message : String(error),
      });
      return {};
    }
  }

  private async parseProcessList(output: string): Promise<ProcessInfo[]> {
    const lines = output.trim().split('\n');
    const processes: ProcessInfo[] = [];
    const now = new Date();

    for (const line of lines) {
      try {
        const [
          pid,
          ppid,
          cpu,
          memory,
          vsz,
          rss,
          tty,
          stat,
          start,
          time,
          command,
          ...args
        ] = line.trim().split(/\s+/);

        const status = this.parseProcessStatus(stat);
        const startTime = this.parseStartTime(start);
        const memoryUsage = parseInt(memory, 10);
        const cpuUsage = parseFloat(cpu);

        processes.push({
          pid: parseInt(pid, 10),
          ppid: parseInt(ppid, 10),
          name: command,
          command,
          args,
          username: '',
          user: '',
          cpuUsage,
          memoryUsage,
          cpu: cpuUsage,
          memory: memoryUsage,
          status,
          startTime,
          threads: 0,
          fds: 0,
          memoryRss: parseInt(rss, 10) * 1024,
          memoryVms: parseInt(vsz, 10) * 1024,
          createdAt: now,
          updatedAt: now,
        });
      } catch (error) {
        logger.error('Failed to parse process line:', {
          line,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return processes;
  }

  private parseProcessStatus(stat: string): ProcessStatus {
    switch (stat[0]) {
      case 'R':
        return ProcessStatus.RUNNING;
      case 'S':
        return ProcessStatus.SLEEPING;
      case 'T':
        return ProcessStatus.STOPPED;
      case 'Z':
        return ProcessStatus.ZOMBIE;
      default:
        return ProcessStatus.UNKNOWN;
    }
  }

  private parseStartTime(start: string): Date {
    const now = new Date();
    const [hour, minute] = start.split(':');

    // If the process started today
    const startTime = new Date(now);
    startTime.setHours(parseInt(hour, 10));
    startTime.setMinutes(parseInt(minute, 10));
    startTime.setSeconds(0);
    startTime.setMilliseconds(0);

    // If the start time is in the future, it must be from yesterday
    if (startTime > now) {
      startTime.setDate(startTime.getDate() - 1);
    }

    return startTime;
  }

  async listProcessesViaSSH(host: Host): Promise<ProcessInfo[]> {
    try {
      const result = await sshService.executeCommand(host.id, 'ps -eo pid,ppid,%cpu,%mem,vsz,rss,tty,stat,start,time,comm,args');
      if (result.code !== 0) {
        throw new Error(`Failed to list processes: ${result.stderr}`);
      }
      return await this.parseProcessList(result.stdout);
    } catch (error) {
      logger.error('Failed to list processes:', {
        hostId: host.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getProcessMetrics(host: Host, pid: number): Promise<ProcessMetrics | null> {
    try {
      const result = await sshService.executeCommand(host.id, `ps -p ${pid} -o pid,comm,%cpu,%mem,rss,vsz`);
      if (result.code !== 0) {
        return null;
      }

      const lines = result.stdout.trim().split('\n');
      if (lines.length < 2) {
        return null;
      }

      const [
        _,
        processLine
      ] = lines;

      const [
        pidStr,
        command,
        cpuStr,
        memStr,
        rssStr,
        vszStr
      ] = processLine.trim().split(/\s+/);

      const now = new Date();

      return {
        pid: parseInt(pidStr, 10),
        name: command,
        command,
        username: '',
        cpuUsage: parseFloat(cpuStr),
        memoryUsage: parseFloat(memStr),
        memoryRss: parseInt(rssStr, 10) * 1024,
        memoryVms: parseInt(vszStr, 10) * 1024,
        threads: 0,
        fds: 0,
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      logger.error('Failed to get process metrics:', {
        hostId: host.id,
        pid,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
}

// Export factory function instead of singleton since we need io instance
export const createProcessService = (io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents>) => {
  return new ProcessService(io);
};
