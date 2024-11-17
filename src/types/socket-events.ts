import type { NotificationType } from './notifications';
import type { Host } from './host';
import type { ProcessInfo } from './process';
import type { SystemMetrics } from './metrics';
import type { DockerStats, DockerContainer } from './docker';
import type { LogEntry, LogFilter } from './logging';

// Socket Event Types
export interface SocketEvents {
  // Host Events
  'host:connect': (data: { hostId: string }, callback: (response: { error?: string }) => void) => void;
  'host:disconnect': (data: { hostId: string }, callback: (response: { error?: string }) => void) => void;
  'host:updated': (host: Host) => void;

  // Process Events
  'process:monitor': (data: { hostId: string }) => void;
  'process:unmonitor': (data: { hostId: string }) => void;
  'process:list': (data: { hostId: string; processes: ProcessInfo[] }) => void;
  'process:update': (data: { hostId: string; process: ProcessInfo }) => void;
  'process:error': (data: { hostId: string; error: string }) => void;
  'process:kill': (data: { hostId: string; pid: number; signal?: string }) => void;

  // Metrics Events
  'metrics:subscribe': (data: { hostId: string }) => void;
  'metrics:unsubscribe': (data: { hostId: string }) => void;
  'metrics:update': (data: { hostId: string; metrics: SystemMetrics }) => void;

  // Docker Events
  'docker:subscribe': (data: { hostId: string }) => void;
  'docker:unsubscribe': (data: { hostId: string }) => void;
  'docker:stats': (data: { hostId: string; stats: DockerStats }) => void;
  'docker:containers': (data: { hostId: string; containers: DockerContainer[] }) => void;
  'docker:error': (data: { hostId: string; error: string }) => void;

  // Log Events
  'logs:subscribe': (data: { hostIds: string[]; filter?: LogFilter }) => void;
  'logs:unsubscribe': (data: { hostIds: string[] }) => void;
  'logs:filter': (data: { filter: LogFilter }) => void;
  'logs:new': (log: LogEntry) => void;
  'logs:error': (data: { error: string }) => void;

  // Notification Events
  'notifications:preferences:get': (
    data: { userId: string },
    callback: (response: NotificationPreferencesResponse) => void
  ) => void;
  'notifications:preferences:update': (
    data: { userId: string; channel: string; types: NotificationType[] },
    callback: (response: NotificationPreferencesResponse) => void
  ) => void;
}

// Response Types
export interface NotificationPreferencesResponse {
  success: boolean;
  error?: string;
  data?: {
    web: NotificationType[];
    gotify: NotificationType[];
    desktop: NotificationType[];
  };
}

// Socket Client Type
export interface SocketClient {
  emit<E extends keyof SocketEvents>(
    event: E,
    ...args: Parameters<SocketEvents[E]>
  ): this;

  on<E extends keyof SocketEvents>(
    event: E,
    listener: SocketEvents[E]
  ): this;

  off<E extends keyof SocketEvents>(
    event: E,
    listener?: SocketEvents[E]
  ): this;
}
