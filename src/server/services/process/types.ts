import { Server } from 'socket.io';
import type { ProcessInfo } from '../../../types/metrics';
import type { ServerToClientEvents, ClientToServerEvents, InterServerEvents } from '../../../types/socket.io';

export interface ProcessCache {
  get(hostId: string): Map<number, ProcessInfo> | undefined;
  set(hostId: string, processes: Map<number, ProcessInfo>): void;
  delete(hostId: string): void;
}

export interface ProcessMonitorOptions {
  updateInterval?: number;
  maxProcesses?: number;
  includeDetails?: boolean;
}

export interface ProcessServiceOptions {
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents>;
  monitorOptions?: ProcessMonitorOptions;
}
