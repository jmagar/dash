import type { ProcessInfo } from './metrics';
import type { Container, Host } from './models-shared';

export type MessageType =
  | 'command'
  | 'config'
  | 'update'
  | 'metrics'
  | 'logs'
  | 'register'
  | 'heartbeat'
  | 'result';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  hostname: string;
  program: string;
  metadata?: Record<string, any>;
  facility?: string;
}

export interface LogFilter {
  level?: string[];
  program?: string[];
  hostname?: string[];
  search?: string;
  startTime?: string;
  endTime?: string;
}

export interface AgentInfo {
  id: string;
  version: string;
  hostname: string;
  platform: string;
  arch: string;
  labels?: Record<string, string>;
  features?: string[];
}

export interface AgentCommand {
  command: string;
  args?: string[];
}

export interface AgentResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ResultPayload {
  command_id: string;
  exit_code: number;
  stdout: string;
  stderr: string;
}

export interface AgentMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: {
    rx_bytes: number;
    tx_bytes: number;
  };
}

export interface AgentLog {
  level: string;
  message: string;
  timestamp: string;
  fields?: Record<string, unknown>;
}

export interface AgentConfig {
  settings: Record<string, unknown>;
}

export interface AgentUpdate {
  version: string;
  download_url: string;
  checksum: string;
}

export interface AgentHeartbeat {
  status: string;
  uptime: number;
  load_avg: [number, number, number];
  processes: number;
}

export interface CommandResult {
  exit_code: number;
  stdout: string;
  stderr: string;
}

export interface ContainerEvent {
  action: string;
  id: string;
  name: string;
  type: string;
  status: string;
  labels: Record<string, string>;
  timeNano: number;
}

export interface DockerStats {
  containers: number;
  cpuUsage: string;
  memoryUsage: string;
  diskUsage: string;
  networkRx: string;
  networkTx: string;
}

export interface ServerToClientEvents {
  // Process events
  'process:list': (data: { hostId: string; processes: ProcessInfo[] }) => void;
  'process:started': (data: { hostId: string; process: ProcessInfo }) => void;
  'process:ended': (data: { hostId: string; process: ProcessInfo }) => void;
  'process:error': (data: { hostId: string; error: string }) => void;
  'process:update': (data: { hostId: string; process: ProcessInfo }) => void;
  'process:changed': (data: { hostId: string; process: ProcessInfo; oldStatus: string }) => void;

  // Log events
  'logs:stream': (data: { hostId: string; logs: LogEntry[] }) => void;
  'logs:error': (data: { hostId: string; error: string }) => void;

  // Docker events
  'docker:containers': (data: { hostId: string; containers: Container[] }) => void;
  'docker:container:created': (data: { hostId: string; container: Container }) => void;
  'docker:container:started': (data: { hostId: string; container: Container }) => void;
  'docker:container:stopped': (data: { hostId: string; container: Container }) => void;
  'docker:container:removed': (data: { hostId: string; containerId: string }) => void;
  'docker:event': (data: { hostId: string; event: ContainerEvent }) => void;
  'docker:stats': (data: { hostId: string; stats: DockerStats }) => void;
  'docker:error': (data: { hostId: string; error: string }) => void;

  // Command events
  'command:result': (data: CommandResult) => void;
  'command:started': (data: { hostId: string; commandId: string }) => void;
  'command:completed': (data: { hostId: string; commandId: string; result: CommandResult }) => void;
  'command:failed': (data: { hostId: string; commandId: string; error: string }) => void;

  // Host events
  'host:connected': (host: Host) => void;
  'host:disconnected': (hostId: string) => void;
  'host:error': (data: { hostId: string; error: string }) => void;
  'host:updated': (host: Host) => void;

  // Terminal events
  'terminal:data': (data: { hostId: string; sessionId: string; data: string }) => void;
  'terminal:exit': (data: { hostId: string; sessionId: string; code: number }) => void;
  'terminal:error': (data: { hostId: string; sessionId: string; error: string }) => void;

  // Agent events
  'agent:metrics': (data: { hostId: string; metrics: AgentMetrics }) => void;
  'agent:config': (data: { hostId: string; config: AgentConfig }) => void;
  'agent:update': (data: { hostId: string; update: AgentUpdate }) => void;
  'agent:heartbeat': (data: { hostId: string; heartbeat: AgentHeartbeat }) => void;
}

export interface ClientToServerEvents {
  // Process events
  'process:monitor': (data: { hostId: string }) => void;
  'process:unmonitor': (data: { hostId: string }) => void;
  'process:kill': (data: { hostId: string; pid: number; signal?: string }) => void;

  // Command events
  'command:execute': (data: { hostId: string; command: AgentCommand }) => void;

  // Log events
  'logs:subscribe': (data: { hostIds: string[]; filter?: LogFilter }) => void;
  'logs:unsubscribe': (data: { hostIds: string[] }) => void;

  // Docker events
  'docker:subscribe': (data: { hostId: string }) => void;
  'docker:unsubscribe': (data: { hostId: string }) => void;
  'docker:container:start': (data: { hostId: string; containerId: string }) => void;
  'docker:container:stop': (data: { hostId: string; containerId: string }) => void;
  'docker:container:restart': (data: { hostId: string; containerId: string }) => void;
  'docker:container:remove': (data: { hostId: string; containerId: string; force?: boolean }) => void;

  // Terminal events
  'terminal:join': (data: { hostId: string; sessionId: string }) => void;
  'terminal:leave': (data: { hostId: string; sessionId: string }) => void;
  'terminal:data': (data: { hostId: string; sessionId: string; data: string }) => void;
  'terminal:resize': (data: { hostId: string; sessionId: string; cols: number; rows: number }) => void;

  // Agent events
  'agent:config:update': (data: { hostId: string; config: AgentConfig }) => void;
  'agent:update:start': (data: { hostId: string }) => void;

  // Connection events
  'join': (room: string) => void;
  'leave': (room: string) => void;
}

export interface ServerToAgentEvents {
  'command': (command: string, args?: string[]) => void;
  'ping': () => void;
  'logs:subscribe': (filter?: LogFilter) => void;
  'logs:unsubscribe': () => void;
}

export interface AgentToServerEvents {
  'register': (info: AgentInfo) => void;
  'heartbeat': (data: { timestamp: string; load: number[] }) => void;
  'metrics': (data: AgentMetrics) => void;
  'commandResult': (result: CommandResult) => void;
  'error': (error: Error) => void;
  'logs': (logs: LogEntry[]) => void;
}

export interface InterServerEvents {
  ping: () => void;
}
