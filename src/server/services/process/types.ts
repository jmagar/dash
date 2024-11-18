import type { ProcessInfo } from '@/types/process';

export interface ProcessCache {
  get(hostId: string): Map<number, ProcessInfo> | undefined;
  set(hostId: string, processes: Map<number, ProcessInfo>): void;
  delete(hostId: string): void;
}

export interface ProcessMonitorOptions {
  hostId: string;
  interval?: number;
  includeChildren?: boolean;
  excludeSystemProcesses?: boolean;
  sortBy?: 'cpu' | 'memory' | 'pid' | 'name';
  sortOrder?: 'asc' | 'desc';
  maxProcesses?: number;
}

export interface ProcessServiceOptions {
  monitorFactory: ProcessMonitorFactory;
  defaultInterval?: number;
  maxMonitoredHosts?: number;
  includeChildren?: boolean;
  excludeSystemProcesses?: boolean;
  sortBy?: 'cpu' | 'memory' | 'pid' | 'name';
  sortOrder?: 'asc' | 'desc';
  maxProcesses?: number;
}

export interface ProcessService {
  // Monitor processes for a host
  monitor(hostId: string): Promise<void>;

  // Stop monitoring processes for a host
  unmonitor(hostId: string): Promise<void>;

  // Get current process list for a host
  getProcesses(hostId: string): Promise<ProcessInfo[]>;

  // Kill a process on a host
  killProcess(hostId: string, pid: number, signal?: string): Promise<void>;

  // Get process metrics for a host
  getProcessMetrics(hostId: string): Promise<ProcessInfo[]>;

  // Get a specific process by PID
  getProcessById(hostId: string, pid: number): Promise<ProcessInfo | null>;

  // Check if a process is being monitored
  isMonitored(hostId: string): boolean;

  // Get all monitored hosts
  getMonitoredHosts(): string[];

  // Event handlers
  onProcessStart(callback: (hostId: string, process: ProcessInfo) => void): void;
  onProcessEnd(callback: (hostId: string, process: ProcessInfo) => void): void;
  onProcessChange(callback: (hostId: string, process: ProcessInfo, oldStatus: string) => void): void;
  onError(callback: (hostId: string, error: string) => void): void;
}

export interface ProcessMonitor {
  start(): Promise<void>;
  stop(): Promise<void>;
  getProcesses(): Promise<ProcessInfo[]>;
  killProcess(pid: number, signal?: string): Promise<void>;
  isRunning(): boolean;
}

export interface ProcessMonitorFactory {
  create(options: ProcessMonitorOptions): ProcessMonitor;
}

export interface ProcessServiceEvents {
  processStart: (hostId: string, process: ProcessInfo) => void;
  processEnd: (hostId: string, process: ProcessInfo) => void;
  processChange: (hostId: string, process: ProcessInfo, oldStatus: string) => void;
  error: (hostId: string, error: string) => void;
}
