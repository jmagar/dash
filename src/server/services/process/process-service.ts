import { EventEmitter } from 'events';
import { Server, Socket } from 'socket.io';
import { LoggingManager } from '../../managers/LoggingManager';
import { getAgentService } from '../agent.service';
import { sshService } from '../ssh.service';
import { db } from '../../db';
import { parseProcessList } from './process-parser';
import { 
  ProcessMonitor, 
  ProcessCache, 
  ProcessServiceOptions, 
  ProcessService,
  ProcessEventPayload,
  BaseErrorPayload,
  ProcessInfo,
  ProcessId,
  createProcessId
} from './types';
import type { Host } from '../../../types/models-shared';
import type { ServerToClientEvents, ClientToServerEvents, InterServerEvents } from '../../../types/socket-events';

class MapProcessCache implements ProcessCache {
  private readonly cache = new Map<string, Map<ProcessId, ProcessInfo>>();
  private readonly logger: LoggingManager;

  constructor() {
    this.logger = LoggingManager.getInstance();
  }

  get(hostId: string): Map<ProcessId, ProcessInfo> | undefined {
    return this.cache.get(hostId);
  }

  set(hostId: string, processes: Map<ProcessId, ProcessInfo>): void {
    try {
      const newMap = new Map<ProcessId, ProcessInfo>();
      processes?.forEach?.((value: ProcessInfo, key: ProcessId) => {
        if (value && key) {
          newMap.set(key, { ...value });
        }
      });
      
      if (newMap.size > 0) {
        this.cache.set(hostId, newMap);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Error setting process cache', { 
        hostId, 
        error: errorMessage 
      });
    }
  }

  delete(hostId: string): void {
    this.cache.delete(hostId);
  }

  clear(): void {
    this.cache.clear();
  }
}

export class ProcessServiceImpl extends EventEmitter implements ProcessService {
  private readonly monitors: Map<string, ProcessMonitor> = new Map();
  private readonly options: Required<ProcessServiceOptions>;
  private readonly processCache: ProcessCache;
  private readonly logger: LoggingManager;
  private readonly agentService: ReturnType<typeof getAgentService>;

  constructor(
    private readonly io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents>,
    { monitorFactory, ...options }: ProcessServiceOptions
  ) {
    super();
    this.logger = LoggingManager.getInstance();
    this.agentService = getAgentService();
    
    if (!monitorFactory) {
      this.logger.error('Process monitor factory not provided');
      throw new Error('Process monitor factory is required');
    }

    this.options = {
      monitorFactory,
      defaultInterval: options.defaultInterval ?? 5000,
      maxMonitoredHosts: options.maxMonitoredHosts ?? 100,
      includeChildren: options.includeChildren ?? false,
      excludeSystemProcesses: options.excludeSystemProcesses ?? false,
      sortBy: options.sortBy ?? 'cpu',
      sortOrder: options.sortOrder ?? 'desc',
      maxProcesses: options.maxProcesses ?? 1000,
      pollInterval: options.pollInterval ?? 5000,
      cacheEnabled: options.cacheEnabled ?? true
    };

    this.processCache = new MapProcessCache();
    this.setupSocketHandlers();
  }

  async monitor(hostId: string): Promise<void> {
    if (this.monitors.size >= this.options.maxMonitoredHosts) {
      throw new Error(`Maximum number of monitored hosts (${this.options.maxMonitoredHosts}) reached`);
    }

    if (this.monitors.has(hostId)) {
      return;
    }

    const monitor = this.options.monitorFactory.create({
      hostId,
      interval: this.options.defaultInterval,
      includeChildren: this.options.includeChildren,
      excludeSystemProcesses: this.options.excludeSystemProcesses,
      sortBy: this.options.sortBy,
      sortOrder: this.options.sortOrder,
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
      this.processCache.delete(hostId);
    }
  }

  async getProcesses(hostId: string): Promise<ProcessInfo[]> {
    try {
      const monitor = this.monitors.get(hostId);
      if (monitor) {
        return await monitor.getProcesses();
      }
      return await this.listProcesses(hostId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Error getting processes', { 
        hostId, 
        error: errorMessage 
      });
      throw error;
    }
  }

  async getProcessMetrics(hostId: string): Promise<ProcessInfo[]> {
    return this.getProcesses(hostId);
  }

  async getProcessById(hostId: string, pid: ProcessId): Promise<ProcessInfo | null> {
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

  onError(callback: (hostId: string, payload: ProcessEventPayload & BaseErrorPayload) => void): void {
    this.on('error', (hostId: string, error: string) => {
      callback(hostId, {
        processId: createProcessId(0),
        timestamp: new Date().toISOString(),
        error
      });
    });
  }

  async killProcess(hostId: string, pid: ProcessId, signal: NodeJS.Signals = 'SIGTERM'): Promise<void> {
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

      if (this.agentService.isConnected(hostId)) {
        await this.agentService.executeCommand(hostId, 'kill', ['-' + signal, pid.toString()]);
        return;
      }

      await this.executeCommand(host, `kill -${signal} ${pid}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Error killing process', { 
        hostId, 
        pid, 
        error: errorMessage 
      });
      throw error;
    }
  }

  async listProcesses(hostId: string): Promise<ProcessInfo[]> {
    try {
      if (this.agentService.isConnected(hostId)) {
        return await this.listViaAgent(hostId);
      }
      return await this.listViaSSH(hostId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Error listing processes', { 
        hostId, 
        error: errorMessage 
      });
      throw error;
    }
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
      socket.on('process:monitor', ({ hostId }) => {
        void (async () => {
          try {
            const host = await this.getHost(hostId);
            if (host) {
              await this.monitor(hostId);
              await socket.join(`host:${hostId}`);
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error('Error monitoring host', { 
              hostId, 
              error: errorMessage 
            });
            socket.emit('process:error', {
              hostId,
              processId: createProcessId(0),
              timestamp: new Date().toISOString(),
              error: 'Failed to start monitoring'
            });
          }
        })();
      });

      socket.on('process:unmonitor', ({ hostId }) => {
        void (async () => {
          try {
            await this.unmonitor(hostId);
            await socket.leave(`host:${hostId}`);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error('Error unmonitoring host', { 
              hostId, 
              error: errorMessage 
            });
          }
        })();
      });

      socket.on('process:kill', ({ hostId, pid, signal }) => {
        void (async () => {
          try {
            await this.killProcess(hostId, createProcessId(pid), signal);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error('Error killing process', { 
              hostId, 
              pid, 
              error: errorMessage 
            });
            socket.emit('process:error', {
              hostId,
              processId: createProcessId(pid),
              timestamp: new Date().toISOString(),
              error: 'Failed to kill process'
            });
          }
        })();
      });
    });
  }

  private async listViaAgent(hostId: string): Promise<ProcessInfo[]> {
    return new Promise<ProcessInfo[]>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.agentService.removeListener('agent:commandResult', handler);
        reject(new Error('Command timed out'));
      }, 30000);

      const handler = ({ hostId: resultHostId, command, result }: { hostId: string; command: string; result: string }) => {
        if (resultHostId === hostId && command === 'ps') {
          try {
            clearTimeout(timeout);
            this.agentService.removeListener('agent:commandResult', handler);
            const processes = parseProcessList(result);
            resolve(processes);
          } catch (error) {
            clearTimeout(timeout);
            this.agentService.removeListener('agent:commandResult', handler);
            reject(error);
          }
        }
      };

      void this.agentService.executeCommand(
        hostId, 
        'ps', 
        ['-eo', 'pid,ppid,user,%cpu,%mem,stat,start,comm,args']
      ).catch(error => {
        clearTimeout(timeout);
        this.agentService.removeListener('agent:commandResult', handler);
        reject(error);
      });

      this.agentService.on('agent:commandResult', handler);
    });
  }

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

  private async getHost(hostId: string): Promise<Host | null> {
    try {
      const result = await db.query<Host>(
        'SELECT * FROM hosts WHERE id = $1',
        [hostId]
      );
      return result.rows[0] || null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Error fetching host', { 
        hostId, 
        error: errorMessage 
      });
      return null;
    }
  }

  private async executeCommand(host: Host, command: string): Promise<string> {
    try {
      const result = await sshService.executeCommand(host.id, command);
      if (result.exitCode !== 0) {
        throw new Error(`Command failed (exit code ${result.exitCode}): ${result.stderr}`);
      }
      return result.stdout;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Error executing command', { 
        hostId: host.id, 
        command, 
        error: errorMessage 
      });
      throw error;
    }
  }

  stop(): void {
    void Promise.all(
      Array.from(this.monitors.values()).map(monitor => monitor.stop())
    );
    this.processCache.clear();
    this.removeAllListeners();
  }
}
