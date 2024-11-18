import { Server } from 'socket.io';
import type { ProcessMonitor , ProcessMonitorOptions , ProcessCache } from './types';
import type { Host } from '../../../types/models-shared';
import type { ProcessInfo } from '../../../types/metrics';

export class ProcessMonitorImpl implements ProcessMonitor {
  private hostId: string;
  private interval: number;
  private running = false;
  private intervalId?: NodeJS.Timeout;

  constructor(
    private io: Server,
    private processCache: ProcessCache,
    private listProcesses: (host: Host) => Promise<ProcessInfo[]>,
    private getHost: (hostId: string) => Promise<Host | null>,
    options: ProcessMonitorOptions
  ) {
    this.hostId = options.hostId;
    this.interval = options.interval || 5000;
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    const host = await this.getHost(this.hostId);
    if (!host) {
      throw new Error(`Host ${this.hostId} not found`);
    }

    await this.updateProcesses(host);
    this.intervalId = setInterval(() => this.updateProcesses(host), this.interval);
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    this.processCache.delete(this.hostId);
  }

  async getProcesses(): Promise<ProcessInfo[]> {
    const host = await this.getHost(this.hostId);
    if (!host) {
      throw new Error(`Host ${this.hostId} not found`);
    }
    return this.listProcesses(host);
  }

  async killProcess(pid: number, signal?: string): Promise<void> {
    // Implementation would depend on how you want to handle process killing
    throw new Error('Process killing not implemented');
  }

  isRunning(): boolean {
    return this.running;
  }

  private async updateProcesses(host: Host): Promise<void> {
    try {
      const processes = await this.listProcesses(host);
      const now = new Date();

      this.io.to(`host:${this.hostId}`).emit('process:metrics', {
        hostId: this.hostId,
        processes: processes.map(p => ({
          ...p,
          timestamp: now,
          createdAt: now,
          updatedAt: now
        }))
      });
    } catch (error) {
      this.io.to(`host:${this.hostId}`).emit('process:error', {
        hostId: this.hostId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export class ProcessMonitorFactory {
  constructor(
    private io: Server,
    private processCache: ProcessCache,
    private listProcesses: (host: Host) => Promise<ProcessInfo[]>,
    private getHost: (hostId: string) => Promise<Host | null>
  ) {}

  create(options: ProcessMonitorOptions): ProcessMonitor {
    return new ProcessMonitorImpl(
      this.io,
      this.processCache,
      this.listProcesses,
      this.getHost,
      options
    );
  }
}
