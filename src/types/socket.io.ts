import type { ProcessInfo } from '../server/services/process.service';

export interface ServerToClientEvents {
  'process:list': (data: { hostId: string; processes: ProcessInfo[] }) => void;
  'process:started': (data: { hostId: string; process: ProcessInfo }) => void;
  'process:ended': (data: { hostId: string; process: ProcessInfo }) => void;
  'process:changed': (data: { hostId: string; process: ProcessInfo; oldStatus: string }) => void;
  'process:error': (data: { hostId: string; error: string }) => void;
  'host:connected': (data: { hostId: string }) => void;
  'host:disconnected': (data: { hostId: string }) => void;
  'host:error': (data: { hostId: string; error: string }) => void;
  'command:started': (data: { hostId: string; commandId: string }) => void;
  'command:completed': (data: { hostId: string; commandId: string; result: any }) => void;
  'command:failed': (data: { hostId: string; commandId: string; error: string }) => void;
}

export interface ClientToServerEvents {
  'process:monitor': (data: { hostId: string }) => void;
  'process:unmonitor': (data: { hostId: string }) => void;
  'process:kill': (data: { hostId: string; pid: number; signal?: string }) => void;
  'command:execute': (data: { hostId: string; command: string; args?: string[] }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}
