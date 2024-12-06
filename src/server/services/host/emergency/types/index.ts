import type { Host } from '../../../../../types/host';
import { ServiceStatus } from '../../../../../types/status';

export interface DiskUsage {
  used: number;
  total: number;
  percent: number;
}

export interface MemoryUsage {
  used: number;
  total: number;
  percent: number;
}

export interface OperationResult<T = void> {
  success: boolean;
  error?: Error;
  state: HostState;
  data?: T;
}

export enum HostState {
  ACTIVE = ServiceStatus.ACTIVE,
  ERROR = ServiceStatus.ERROR,
  MAINTENANCE = ServiceStatus.INACTIVE,
  UNREACHABLE = ServiceStatus.INACTIVE
}

export interface EmergencyOperations {
  restart(hostId: string): Promise<OperationResult>;
  killProcess(hostId: string, pid: number): Promise<OperationResult>;
  checkConnectivity(hostId: string): Promise<OperationResult<boolean>>;
  cleanup(): Promise<void>;
}
