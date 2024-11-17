import { EventEmitter } from 'events';
import { Server } from 'socket.io';
import { logger } from '../../utils/logger';
import { agentService } from '../agent.service';
import { sshService } from '../ssh.service';
import { db } from '../../db';
import { parseProcessList } from './process-parser';
import { ProcessMonitor } from './process-monitor';
import type { Host, CommandResult } from '../../../types/models-shared';
import type { ServerToClientEvents, ClientToServerEvents, InterServerEvents } from '../../../types/socket.io';
import type { ProcessInfo } from '../../../types/metrics';
import type { ProcessCache } from './types';

export class ProcessService extends EventEmitter {
  private processCache: Map<string, Map<number, ProcessInfo>> = new Map();
  private monitor: ProcessMonitor;

  constructor(private io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents>) {
    super();
    this.monitor = new ProcessMonitor(
      io,
      this.createProcessCache(),
      this.listProcesses.bind(this),
      this.getHost.bind(this)
    );
    this.setupSocketHandlers();
  }

  /**
   * List processes on a host
   */
  public async listProcesses(host: Host): Promise<ProcessInfo[]> {
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
  public async killProcess(host: Host, pid: number, signal = 'SIGTERM'): Promise<void> {
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
   * Setup Socket.IO event handlers
   */
  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      socket.on('process:monitor', async ({ hostId }) => {
        try {
          const host = await this.getHost(hostId);
          if (host) {
            await this.monitor.startMonitoringHost(host);
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
        this.monitor.stopMonitoringHost(hostId);
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
   * Create process cache implementation
   */
  private createProcessCache(): ProcessCache {
    return {
      get: (hostId: string) => this.processCache.get(hostId),
      set: (hostId: string, processes: Map<number, ProcessInfo>) => {
        this.processCache.set(hostId, processes);
      },
      delete: (hostId: string) => {
        this.processCache.delete(hostId);
      },
    };
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
            resolve(parseProcessList(data.result.stdout));
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
    const result = await sshService.executeCommand(host.id, command);
    if (result.code !== 0) {
      throw new Error(`Command failed: ${result.stderr}`);
    }
    return result.stdout;
  }

  /**
   * Stop the service
   */
  public stop(): void {
    this.monitor.stop();
    this.processCache.clear();
    this.removeAllListeners();
  }
}
