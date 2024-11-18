import type { SystemMetrics, ProcessInfo, ProcessMetrics } from './metrics';
import type { LogEntry, LogFilter } from './logging';
import type { Host } from './host';
import type { DockerStats, DockerContainer, DockerComposeConfig } from './docker';
import type { Notification, NotificationType, DesktopNotification } from './notifications';
import type { ChatMessage } from './chat';

// Re-export types that are used in socket events
export type {
  SystemMetrics,
  ProcessInfo,
  ProcessMetrics,
  LogEntry,
  LogFilter,
  Host,
  DockerStats,
  DockerContainer,
  DockerComposeConfig,
  Notification,
  NotificationType,
  DesktopNotification,
  ChatMessage
};

// Socket Event Types
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

  // Chat Events
  'chat:message': (data: ChatMessage) => void;

  // Error Events
  'error': (error: Error | string) => void;
  'connect_error': (error: Error) => void;
  'disconnect': (reason: string) => void;
}

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

  // Metrics Events
  'metrics:subscribe': (data: { hostId: string }) => void;
  'metrics:unsubscribe': (data: { hostId: string }) => void;

  // Docker Events
  'docker:subscribe': (data: { hostId: string }) => void;
  'docker:unsubscribe': (data: { hostId: string }) => void;

  // Docker Compose Events
  'docker:compose:create': (data: { hostId: string; name: string; content: string }, callback: (response: { error?: string }) => void) => void;
  'docker:compose:update': (data: { hostId: string; name: string; content: string }, callback: (response: { error?: string }) => void) => void;
  'docker:compose:delete': (data: { hostId: string; name: string }, callback: (response: { error?: string }) => void) => void;
  'docker:compose:get': (data: { hostId: string; name: string }, callback: (response: { error?: string; config?: DockerComposeConfig }) => void) => void;
  'docker:compose:list': (data: { hostId: string }, callback: (response: { error?: string; configs?: DockerComposeConfig[] }) => void) => void;

  // Log Events
  'logs:subscribe': (data: { hostIds: string[]; filter?: LogFilter }) => void;
  'logs:unsubscribe': (data: { hostIds: string[] }) => void;
  'logs:filter': (data: { filter: LogFilter }) => void;

  // Chat Events
  'chat:send': (data: ChatMessage) => void;

  // Error Events
  'error': (error: Error | string) => void;
}

export interface InterServerEvents {
  ping: () => void;
}
