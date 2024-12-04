import type { ProcessMetrics } from '../../../types/metrics';
import type { BaseEntity } from '../../../types/base';

// Branded type for ProcessId
export type ProcessId = number & { readonly __brand: 'ProcessId' };

// Create a type that includes BaseEntity fields but with our modifications
type ProcessBaseEntity = Omit<BaseEntity, 'id'> & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

// Extend ProcessMetrics with our custom fields and modified base fields
export interface ProcessInfo extends Omit<ProcessMetrics, keyof BaseEntity | 'pid'>, ProcessBaseEntity {
  pid: ProcessId;
  name: string;
  command: string;
  args: string[];
  status: string;
  user: string;
  ppid: ProcessId;
  startTime: string;
}

export interface ProcessCache {
  get(hostId: string): Map<ProcessId, ProcessInfo> | undefined;
  set(hostId: string, processes: Map<ProcessId, ProcessInfo>): void;
  delete(hostId: string): void;
  clear(): void;
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
  pollInterval?: number;
  cacheEnabled?: boolean;
}

export interface ProcessService {
  // Monitor processes for a host
  monitor(hostId: string): Promise<void>;

  // Stop monitoring processes for a host
  unmonitor(hostId: string): Promise<void>;

  // Get current process list for a host
  getProcesses(hostId: string): Promise<ProcessInfo[]>;

  // Kill a process on a host
  killProcess(hostId: string, pid: ProcessId, signal?: NodeJS.Signals): Promise<void>;

  // Get process metrics for a host
  getProcessMetrics(hostId: string): Promise<ProcessInfo[]>;

  // Get a specific process by PID
  getProcessById(hostId: string, pid: ProcessId): Promise<ProcessInfo | null>;

  // Check if a process is being monitored
  isMonitored(hostId: string): boolean;

  // Get all monitored hosts
  getMonitoredHosts(): string[];

  // Event handlers
  onProcessStart(callback: (hostId: string, process: ProcessInfo) => void): void;
  onProcessEnd(callback: (hostId: string, process: ProcessInfo) => void): void;
  onProcessChange(callback: (hostId: string, process: ProcessInfo, oldStatus: string) => void): void;
  onError(callback: (hostId: string, payload: ProcessEventPayload & BaseErrorPayload) => void): void;

  // Cleanup
  stop(): void;
}

export interface ProcessMonitor {
  start(): Promise<void>;
  stop(): Promise<void>;
  getProcesses(): Promise<ProcessInfo[]>;
  killProcess(pid: ProcessId, signal?: NodeJS.Signals): Promise<void>;
  isRunning(): boolean;
}

export interface ProcessMonitorFactory {
  create(options: ProcessMonitorOptions): ProcessMonitor;
}

export interface ProcessEventPayload {
  processId: ProcessId;
  timestamp: string;
}

export interface BaseErrorPayload {
  error: string;
}

export interface ProcessServiceEvents {
  processStart: (hostId: string, process: ProcessInfo) => void;
  processEnd: (hostId: string, process: ProcessInfo) => void;
  processChange: (hostId: string, process: ProcessInfo, oldStatus: string) => void;
  error: (hostId: string, payload: ProcessEventPayload & BaseErrorPayload) => void;
}

// Type guard for ProcessId
export function isProcessId(value: unknown): value is ProcessId {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

// Helper to create ProcessId
export function createProcessId(value: number): ProcessId {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error('Invalid process ID');
  }
  return value as ProcessId;
}
