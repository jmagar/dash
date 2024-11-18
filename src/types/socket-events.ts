import type { NotificationType, Notification, DesktopNotification, NotificationPreferences } from './notifications';
import type { Host } from './models-shared';
import type { ProcessInfo , SystemMetrics } from './metrics';
import type { DockerStats, DockerContainer, DockerComposeConfig } from './docker';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface LogFilter {
  level?: string;
  search?: string;
  startTime?: Date;
  endTime?: Date;
}

export interface NotificationPreferencesResponse {
  success: boolean;
  error?: string;
  data?: {
    preferences?: NotificationPreferences;
  };
}

// Agent-related types
export interface AgentInfo {
  id: string;
  version: string;
  hostname: string;
  platform: string;
  arch: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSeen: Date;
  error?: string;
}

export interface AgentMetrics {
  cpu: SystemMetrics['cpu'];
  memory: SystemMetrics['memory'];
  storage: SystemMetrics['storage'];
  network: SystemMetrics['network'];
  timestamp: Date;
}

export interface AgentCommandResult {
  success: boolean;
  output?: string;
  error?: string;
}

export interface HeartbeatInfo {
  timestamp: Date;
  status: 'healthy' | 'unhealthy';
  error?: string;
}

// Socket Event Names
export type SocketEventName = keyof ClientToServerEvents | keyof ServerToClientEvents;

// Client to Server Events
export interface ClientToServerEvents {
  // Host Events
  'host:connect': (data: { hostId: string }, callback: (response: { error?: string }) => void) => void;
  'host:disconnect': (data: { hostId: string }, callback: (response: { error?: string }) => void) => void;

  // Process Events
  'process:monitor': (data: { hostId: string }) => void;
  'process:unmonitor': (data: { hostId: string }) => void;
  'process:kill': (data: { hostId: string; pid: number; signal?: string }) => void;

  // Terminal Events
  'terminal:join': (data: { hostId: string; sessionId: string }) => void;
  'terminal:leave': (data: { hostId: string; sessionId: string }) => void;
  'terminal:data': (data: { hostId: string; sessionId: string; data: string }) => void;
  'terminal:resize': (data: { hostId: string; sessionId: string; cols: number; rows: number }) => void;

  // Docker Events
  'docker:subscribe': (data: { hostId: string }) => void;
  'docker:unsubscribe': (data: { hostId: string }) => void;

  // Command Events
  'command:execute': (data: {
    hostId: string;
    command: string;
    args?: string[];
    options?: {
      timeout?: number;
      cwd?: string;
      env?: Record<string, string>;
    };
  }) => void;

  // Log Events
  'logs:subscribe': (data: { hostIds: string[]; filter?: LogFilter }) => void;
  'logs:unsubscribe': (data: { hostIds: string[] }) => void;
  'logs:filter': (data: { filter: LogFilter }) => void;
  'logs:stream': (data: { logs: LogEntry[] }) => void;

  // Agent Events
  'agent:connected': (data: { info: AgentInfo }) => void;
  'agent:metrics': (data: { metrics: AgentMetrics }) => void;
  'agent:heartbeat': (data: { timestamp: Date; load: number[] }) => void;
  'agent:command': (data: { command: string; args?: string[] }) => void;

  // Ping/Pong
  'ping': () => void;
  'pong': () => void;
}

// Server to Client Events
export interface ServerToClientEvents {
  // Host Events
  'host:updated': (host: Host) => void;

  // Process Events
  'process:list': (data: { hostId: string; processes: ProcessInfo[] }) => void;
  'process:update': (data: { hostId: string; process: ProcessInfo }) => void;
  'process:error': (data: { hostId: string; error: string }) => void;
  'process:started': (data: { hostId: string; process: ProcessInfo }) => void;
  'process:ended': (data: { hostId: string; process: ProcessInfo }) => void;
  'process:changed': (data: { hostId: string; process: ProcessInfo; oldStatus: string }) => void;
  'process:metrics': (data: { hostId: string; processes: ProcessInfo[] }) => void;

  // Terminal Events
  'terminal:data': (data: { hostId: string; sessionId: string; data: string }) => void;
  'terminal:exit': (data: { hostId: string; sessionId: string; code: number }) => void;

  // Metrics Events
  'metrics:update': (data: { hostId: string; metrics: SystemMetrics }) => void;
  'metrics:error': (data: { hostId: string; error: string }) => void;

  // Docker Events
  'docker:stats': (data: { hostId: string; stats: DockerStats }) => void;
  'docker:containers': (data: { hostId: string; containers: DockerContainer[] }) => void;
  'docker:error': (data: { hostId: string; error: string }) => void;

  // Log Events
  'logs:new': (log: LogEntry) => void;
  'logs:error': (data: { error: string }) => void;
  'logs:stream': (data: { logs: LogEntry[] }) => void;

  // Notification Events
  'notification:created': (notification: Notification) => void;
  'notification:updated': (notification: Notification) => void;
  'notification:deleted': (notificationId: string) => void;
  'notification:desktop': (notification: DesktopNotification) => void;

  // Agent Events
  'agent:connected': (data: { hostId: string; info: AgentInfo }) => void;
  'agent:disconnected': (data: { hostId: string; reason?: string }) => void;
  'agent:error': (data: { hostId: string; error: string }) => void;
  'agent:metrics': (data: { hostId: string; metrics: AgentMetrics }) => void;
  'agent:heartbeat': (data: { hostId: string; info: HeartbeatInfo }) => void;
  'agent:update': (data: { hostId: string; info: AgentInfo }) => void;
  'agent:command': (data: { command: string; args?: string[] }) => void;

  // System Events
  'error': (error: Error | string) => void;
  'connect_error': (error: Error) => void;
  'disconnect': (reason: string) => void;
  'ping': () => void;
  'pong': () => void;
}

export interface InterServerEvents {
  ping: () => void;
  pong: () => void;
}
