import { EventEmitter } from 'events';
import { Server } from 'socket.io';
import { logger } from '../../utils/logger';
import { getAgentService } from '../agent.service';
import { sshService } from '../ssh.service';
import { db } from '../../db';
import { parseProcessList } from './process-parser';
import type { ProcessMonitor, ProcessCache, ProcessServiceOptions, ProcessService } from './types';
import type { Host } from '../../../types/models-shared';
import type { ServerToClientEvents, ClientToServerEvents, InterServerEvents } from '../../../types/socket-events';
import type { ProcessInfo } from '../../../types/metrics';
import { LoggingManager } from '../../../../../../../../../../utils/logging/LoggingManager';

class MapProcessCache implements ProcessCache {
  private readonly cache = new Map<string, Map<number, ProcessInfo>>();

  get(hostId: string): Map<number, ProcessInfo> | undefined {
    return this.cache.get(hostId);
  }

  set(hostId: string, processes: Map<number, ProcessInfo>): void {
    // Create a new Map to avoid reference issues
    const newMap = new Map<number, ProcessInfo>();
    // Safely copy entries from the source map
    processes?.forEach?.((value: ProcessInfo, key: number) => {
      if (value && typeof key === 'number') {
        newMap.set(key, { ...value });
      }
    });
    // Only set the cache if we have valid entries
    if (newMap.size > 0) {
      this.cache.set(hostId, newMap);
    }
  }

  delete(hostId: string): void {
    this.cache.delete(hostId);
  }
}

export class ProcessServiceImpl extends EventEmitter implements ProcessService {
  private readonly monitors: Map<string, ProcessMonitor> = new Map();
  private readonly options: ProcessServiceOptions;
  private readonly processCache: ProcessCache;

  constructor(
    private readonly io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents>,
    { monitorFactory, ...options }: ProcessServiceOptions
  ) {
    super();
    if (!monitorFactory) {
      throw new Error('Monitor factory is required');
    }
    this.options = {
      monitorFactory,
      defaultInterval: 5000,
      maxMonitoredHosts: 100,
      includeChildren: true,
      excludeSystemProcesses: false,
      sortBy: 'cpu',
      sortOrder: 'desc',
      maxProcesses: 100,
      ...options
    };

    this.processCache = new MapProcessCache();
    this.setupSocketHandlers();
  }

  async monitor(hostId: string): Promise<void> {
    const maxMonitoredHosts = this.options.maxMonitoredHosts ?? 100;
    if (this.monitors.size >= maxMonitoredHosts) {
      throw new Error(`Maximum number of monitored hosts (${maxMonitoredHosts}) reached`);
    }

    if (this.monitors.has(hostId)) {
      return;
    }

    if (!this.options.monitorFactory) {
      throw new Error('Monitor factory is not available');
    }

    const monitor = this.options.monitorFactory.create({
      hostId,
      interval: this.options.defaultInterval,
      includeChildren: this.options.includeChildren,
      excludeSystemProcesses: this.options.excludeSystemProcesses,
      sortBy: this.options.sortBy as 'cpu' | 'memory' | 'pid' | 'name',
      sortOrder: this.options.sortOrder as 'asc' | 'desc',
      maxProcesses: this.options.maxProcesses
    });

    await monitor.start();
    this.monitors.set(hostId, monitor);
  }

  async unmonitor(hostId: string): Promise<void> {
    const monitor = this.monitors.get(hostId);
    if (monitor) {
      await monitor.stop();
      this.monitors.delete(hostId);
    }
  }

  async getProcesses(hostId: string): Promise<ProcessInfo[]> {
    try {
      const monitor = this.monitors.get(hostId);
      if (monitor) {
        return await monitor.getProcesses();
      }
      return this.listProcesses(hostId);
    } catch (error) {
      loggerLoggingManager.getInstance().();
      throw error;
    }
  }

  async getProcessMetrics(hostId: string): Promise<ProcessInfo[]> {
    return this.getProcesses(hostId);
  }

  async getProcessById(hostId: string, pid: number): Promise<ProcessInfo | null> {
    const processes = await this.getProcesses(hostId);
    return processes.find(p => p.pid === pid) || null;
  }

  isMonitored(hostId: string): boolean {
    return this.monitors.has(hostId);
  }

  getMonitoredHosts(): string[] {
    return Array.from(this.monitors.keys());
  }

  onProcessStart(callback: (hostId: string, process: ProcessInfo) => void): void {
    this.on('process:start', callback);
  }

  onProcessEnd(callback: (hostId: string, process: ProcessInfo) => void): void {
    this.on('process:end', callback);
  }

  onProcessChange(callback: (hostId: string, process: ProcessInfo, oldStatus: string) => void): void {
    this.on('process:change', callback);
  }

  onError(callback: (hostId: string, error: string) => void): void {
    this.on('error', callback);
  }

  async killProcess(hostId: string, pid: number, signal = 'SIGTERM'): Promise<void> {
    try {
      const monitor = this.monitors.get(hostId);
      if (monitor) {
        await monitor.killProcess(pid, signal);
        return;
      }

      const host = await this.getHost(hostId);
      if (!host) {
        throw new Error('Host not found');
      }

      // Try agent first if available
      const agentService = getAgentService();
      if (agentService.isConnected(hostId)) {
        await agentService.executeCommand(hostId, 'kill', ['-' + signal, pid.toString()]);
        return;
      }

      // Fallback to SSH
      await this.executeCommand(host, `kill -${signal} ${pid}`);
    } catch (error) {
      loggerLoggingManager.getInstance().();
      throw error;
    }
  }

  /**
   * List processes on a host
   */
  public async listProcesses(hostId: string): Promise<ProcessInfo[]> {
    try {
      // Try agent first if available
      const agentService = getAgentService();
      if (agentService.isConnected(hostId)) {
        return await this.listViaAgent(hostId);
      }

      // Fallback to SSH
      return await this.listViaSSH(hostId);
    } catch (error) {
      loggerLoggingManager.getInstance().();
      throw error;
    }
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
            await this.monitor(hostId);
            socket.join(`host:${hostId}`);
          }
        } catch (error) {
          loggerLoggingManager.getInstance().();
          socket.emit('process:error', {
            hostId,
            error: 'Failed to start monitoring',
          });
        }
      });

      socket.on('process:unmonitor', ({ hostId }) => {
        this.unmonitor(hostId);
        socket.leave(`host:${hostId}`);
      });

      socket.on('process:kill', async ({ hostId, pid, signal }) => {
        try {
          await this.killProcess(hostId, pid, signal);
        } catch (error) {
          loggerLoggingManager.getInstance().();
          socket.emit('process:error', {
            hostId,
            error: 'Failed to kill process',
          });
        }
      });
    });
  }

  /**
   * List processes via agent
   */
  private async listViaAgent(hostId: string): Promise<ProcessInfo[]> {
    return new Promise((resolve, reject) => {
      const agentService = getAgentService();
      const timeout = setTimeout(() => {
        agentService.removeListener('agent:commandResult', handler);
        reject(new Error('Command timed out'));
      }, 30000); // 30 second timeout

      const handler = ({ hostId: resultHostId, command, result }: { hostId: string; command: string; result: string }) => {
        if (resultHostId === hostId && command === 'ps') {
          try {
            clearTimeout(timeout);
            agentService.removeListener('agent:commandResult', handler);
            const processes = parseProcessList(result);
            resolve(processes);
          } catch (error) {
            clearTimeout(timeout);
            agentService.removeListener('agent:commandResult', handler);
            reject(error);
          }
        }
      };

      try {
        const executeCommand = agentService.executeCommand?.bind(agentService);
        if (!executeCommand) {
          throw new Error('Agent service execute command not available');
        }
        executeCommand(hostId, 'ps', ['-eo', 'pid,ppid,user,%cpu,%mem,stat,start,comm,args'])
          .catch(error => {
            clearTimeout(timeout);
            agentService.removeListener('agent:commandResult', handler);
            reject(error);
          });
        agentService.on('agent:commandResult', handler);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * List processes via SSH
   */
  private async listViaSSH(hostId: string): Promise<ProcessInfo[]> {
    const host = await this.getHost(hostId);
    if (!host) {
      throw new Error('Host not found');
    }
    const output = await this.executeCommand(
      host,
      'ps -eo pid,ppid,user,%cpu,%mem,vsz,rss,tty,stat,start,time,comm,args'
    );
    return parseProcessList(output);
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

  /**
   * Execute command via SSH
   */
  private async executeCommand(host: Host, command: string): Promise<string> {
    try {
      const result = await sshService.executeCommand(host.id, command);
      if (result.exitCode !== 0) {
        throw new Error(`Command failed (exit code ${result.exitCode}): ${result.stderr}`);
      }
      return result.stdout;
    } catch (error) {
      loggerLoggingManager.getInstance().();
      throw error;
    }
  }

  /**
   * Stop the service and clean up all monitors
   */
  public stop(): void {
    this.monitors.forEach(monitor => monitor.stop());
    this.processCache.delete('*');
    this.removeAllListeners();
  }
}

