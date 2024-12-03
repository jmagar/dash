import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';
import type { ProcessInfo } from '@/types/process';
import type {
import { LoggingManager } from '../../../../../../../../../../utils/logging/LoggingManager';
  ProcessService,
  ProcessMonitor,
  ProcessMonitorFactory,
  ProcessServiceOptions,
} from './types';

export class ProcessServiceImpl extends EventEmitter implements ProcessService {
  private monitors: Map<string, ProcessMonitor>;
  private monitorFactory: ProcessMonitorFactory;
  private options: ProcessServiceOptions;

  constructor(options: ProcessServiceOptions) {
    super();
    this.monitors = new Map();
    this.monitorFactory = options.monitorFactory;
    this.options = options;
  }

  async monitor(hostId: string): Promise<void> {
    if (this.monitors.has(hostId)) {
      return;
    }

    if (this.options.maxMonitoredHosts && this.monitors.size >= this.options.maxMonitoredHosts) {
      throw new Error(`Maximum number of monitored hosts (${this.options.maxMonitoredHosts}) reached`);
    }

    try {
      const monitor = this.monitorFactory.create({
        hostId,
        interval: this.options.defaultInterval,
        includeChildren: this.options.includeChildren,
        excludeSystemProcesses: this.options.excludeSystemProcesses,
        sortBy: this.options.sortBy,
        sortOrder: this.options.sortOrder,
        maxProcesses: this.options.maxProcesses,
      });

      await monitor.start();
      this.monitors.set(hostId, monitor);

      loggerLoggingManager.getInstance().();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      loggerLoggingManager.getInstance().();
      this.emit('error', hostId, errorMessage);
      throw error;
    }
  }

  async unmonitor(hostId: string): Promise<void> {
    const monitor = this.monitors.get(hostId);
    if (!monitor) {
      return;
    }

    try {
      await monitor.stop();
      this.monitors.delete(hostId);
      loggerLoggingManager.getInstance().();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      loggerLoggingManager.getInstance().();
      this.emit('error', hostId, errorMessage);
      throw error;
    }
  }

  async getProcesses(hostId: string): Promise<ProcessInfo[]> {
    const monitor = this.monitors.get(hostId);
    if (!monitor) {
      throw new Error('Host is not being monitored');
    }

    try {
      return await monitor.getProcesses();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      loggerLoggingManager.getInstance().();
      this.emit('error', hostId, errorMessage);
      throw error;
    }
  }

  async killProcess(hostId: string, pid: number, signal?: string): Promise<void> {
    const monitor = this.monitors.get(hostId);
    if (!monitor) {
      throw new Error('Host is not being monitored');
    }

    try {
      await monitor.killProcess(pid, signal);
      loggerLoggingManager.getInstance().();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      loggerLoggingManager.getInstance().();
      this.emit('error', hostId, errorMessage);
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
    this.on('processStart', callback);
  }

  onProcessEnd(callback: (hostId: string, process: ProcessInfo) => void): void {
    this.on('processEnd', callback);
  }

  onProcessChange(callback: (hostId: string, process: ProcessInfo, oldStatus: string) => void): void {
    this.on('processChange', callback);
  }

  onError(callback: (hostId: string, error: string) => void): void {
    this.on('error', callback);
  }
}

