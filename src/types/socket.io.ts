import { z } from 'zod';
import type { 
  SystemMetrics, 
  ProcessInfo, 
  ProcessMetrics 
} from './metrics.types';
import type { 
  LogEntry, 
  LogFilter 
} from './logging';
import type { 
  Host 
} from './host';
import type { 
  DockerStats, 
  DockerContainer, 
  DockerComposeConfig 
} from './docker';
import type { 
  NotificationEntity, 
  NotificationOptions,
  NotificationType,
  DesktopNotificationOptions
} from './notifications';
import type { 
  ChatMessage 
} from './chat';

// Branded types for type safety
export type Brand<K, T> = K & { readonly __brand: T };
export type HostId = Brand<string, 'HostId'>;
export type SessionId = Brand<string, 'SessionId'>;
export type ProcessId = Brand<number, 'ProcessId'>;

// Validation schemas
export const hostIdSchema = z.string().uuid().brand<'HostId'>();
export const sessionIdSchema = z.string().uuid().brand<'SessionId'>();
export const processIdSchema = z.number().int().positive().brand<'ProcessId'>();

// Base event payload types
export interface BaseEventPayload {
  readonly timestamp: string;
  readonly metadata?: Record<string, unknown>;
}

export interface BaseErrorPayload extends BaseEventPayload {
  readonly error: string;
  readonly code?: string;
  readonly details?: unknown;
}

export interface BaseSuccessPayload extends BaseEventPayload {
  readonly success: true;
}

// Host event payloads
export interface HostEventPayload extends BaseEventPayload {
  readonly hostId: HostId;
}

export interface HostErrorPayload extends BaseErrorPayload {
  readonly hostId: HostId;
}

// Process event payloads
export interface ProcessEventPayload extends HostEventPayload {
  readonly processId: ProcessId;
}

export interface ProcessErrorPayload extends HostErrorPayload {
  readonly processId?: ProcessId;
}

// Terminal event payloads
export interface TerminalEventPayload extends HostEventPayload {
  readonly sessionId: SessionId;
}

export interface TerminalErrorPayload extends HostErrorPayload {
  readonly sessionId: SessionId;
}

// Server to client events with strict typing
export interface ServerToClientEvents {
  // Host Events
  'host:updated': (payload: Readonly<Host> & BaseEventPayload) => void;

  // Process Events
  'process:list': (payload: Readonly<{
    hostId: HostId;
    processes: readonly ProcessInfo[];
  }> & BaseEventPayload) => void;
  'process:update': (payload: Readonly<{
    hostId: HostId;
    process: ProcessInfo;
  }> & BaseEventPayload) => void;
  'process:error': (payload: ProcessErrorPayload) => void;
  'process:started': (payload: Readonly<{
    hostId: HostId;
    process: ProcessInfo;
  }> & BaseEventPayload) => void;
  'process:ended': (payload: Readonly<{
    hostId: HostId;
    process: ProcessInfo;
  }> & BaseEventPayload) => void;
  'process:changed': (payload: Readonly<{
    hostId: HostId;
    process: ProcessInfo;
    oldStatus: string;
  }> & BaseEventPayload) => void;
  'process:metrics': (payload: Readonly<{
    hostId: HostId;
    processes: readonly ProcessInfo[];
  }> & BaseEventPayload) => void;

  // Terminal Events
  'terminal:data': (payload: Readonly<{
    hostId: HostId;
    sessionId: SessionId;
    data: string;
  }> & BaseEventPayload) => void;
  'terminal:exit': (payload: Readonly<{
    hostId: HostId;
    sessionId: SessionId;
    code: number;
  }> & BaseEventPayload) => void;

  // Metrics Events
  'metrics:update': (payload: Readonly<{
    hostId: HostId;
    metrics: SystemMetrics;
  }> & BaseEventPayload) => void;
  'metrics:error': (payload: HostErrorPayload) => void;

  // Docker Events
  'docker:stats': (payload: Readonly<{
    hostId: HostId;
    stats: DockerStats;
  }> & BaseEventPayload) => void;
  'docker:containers': (payload: Readonly<{
    hostId: HostId;
    containers: readonly DockerContainer[];
  }> & BaseEventPayload) => void;
  'docker:error': (payload: HostErrorPayload) => void;

  // Log Events
  'logs:new': (payload: Readonly<LogEntry> & BaseEventPayload) => void;
  'logs:error': (payload: BaseErrorPayload) => void;
  'logs:stream': (payload: Readonly<{
    logs: readonly LogEntry[];
  }> & BaseEventPayload) => void;

  // Notification Events
  'notification:created': (payload: Readonly<NotificationEntity> & BaseEventPayload) => void;
  'notification:updated': (payload: Readonly<NotificationEntity> & BaseEventPayload) => void;
  'notification:deleted': (payload: Readonly<{
    notificationId: string;
  }> & BaseEventPayload) => void;
  'notification:desktop': (payload: Readonly<DesktopNotificationOptions> & BaseEventPayload) => void;

  // Chat Events
  'chat:message': (payload: Readonly<ChatMessage> & BaseEventPayload) => void;

  // System Events
  'error': (error: Error | string) => void;
  'connect_error': (error: Error) => void;
  'disconnect': (reason: string) => void;
}

// Client to server events with strict typing
export interface ClientToServerEvents {
  // Host Events
  'host:connect': (
    payload: Readonly<{
      hostId: HostId;
    }> & BaseEventPayload,
    callback: (response: BaseSuccessPayload | BaseErrorPayload) => void
  ) => void;
  'host:disconnect': (
    payload: Readonly<{
      hostId: HostId;
    }> & BaseEventPayload,
    callback: (response: BaseSuccessPayload | BaseErrorPayload) => void
  ) => void;

  // Process Events
  'process:monitor': (payload: HostEventPayload) => void;
  'process:unmonitor': (payload: HostEventPayload) => void;
  'process:kill': (payload: Readonly<{
    hostId: HostId;
    pid: ProcessId;
    signal?: NodeJS.Signals;
  }> & BaseEventPayload) => void;

  // Terminal Events
  'terminal:join': (payload: TerminalEventPayload) => void;
  'terminal:leave': (payload: TerminalEventPayload) => void;
  'terminal:data': (payload: Readonly<{
    hostId: HostId;
    sessionId: SessionId;
    data: string;
  }> & BaseEventPayload) => void;
  'terminal:resize': (payload: Readonly<{
    hostId: HostId;
    sessionId: SessionId;
    cols: number;
    rows: number;
  }> & BaseEventPayload) => void;

  // Metrics Events
  'metrics:subscribe': (payload: HostEventPayload) => void;
  'metrics:unsubscribe': (payload: HostEventPayload) => void;

  // Docker Events
  'docker:subscribe': (payload: HostEventPayload) => void;
  'docker:unsubscribe': (payload: HostEventPayload) => void;
  'docker:compose:create': (
    payload: Readonly<{
      hostId: HostId;
      name: string;
      content: string;
    }> & BaseEventPayload,
    callback: (response: BaseSuccessPayload | BaseErrorPayload) => void
  ) => void;
  'docker:compose:update': (
    payload: Readonly<{
      hostId: HostId;
      name: string;
      content: string;
    }> & BaseEventPayload,
    callback: (response: BaseSuccessPayload | BaseErrorPayload) => void
  ) => void;
  'docker:compose:delete': (
    payload: Readonly<{
      hostId: HostId;
      name: string;
    }> & BaseEventPayload,
    callback: (response: BaseSuccessPayload | BaseErrorPayload) => void
  ) => void;
  'docker:compose:get': (
    payload: Readonly<{
      hostId: HostId;
      name: string;
    }> & BaseEventPayload,
    callback: (response: BaseSuccessPayload & {
      config?: DockerComposeConfig;
    } | BaseErrorPayload) => void
  ) => void;
  'docker:compose:list': (
    payload: HostEventPayload,
    callback: (response: BaseSuccessPayload & {
      configs?: readonly DockerComposeConfig[];
    } | BaseErrorPayload) => void
  ) => void;

  // Log Events
  'logs:subscribe': (payload: Readonly<{
    filter?: LogFilter;
  }> & BaseEventPayload) => void;
  'logs:unsubscribe': () => void;

  // Notification Events
  'notification:subscribe': (payload: BaseEventPayload) => void;
  'notification:unsubscribe': () => void;
  'notification:markRead': (
    payload: Readonly<{
      notificationId: string;
    }> & BaseEventPayload,
    callback: (response: BaseSuccessPayload | BaseErrorPayload) => void
  ) => void;
  'notification:delete': (
    payload: Readonly<{
      notificationId: string;
    }> & BaseEventPayload,
    callback: (response: BaseSuccessPayload | BaseErrorPayload) => void
  ) => void;

  // Chat Events
  'chat:send': (
    payload: Readonly<{
      message: string;
      metadata?: Record<string, unknown>;
    }> & BaseEventPayload,
    callback: (response: BaseSuccessPayload | BaseErrorPayload) => void
  ) => void;
}

// Inter-server events with strict typing
export interface InterServerEvents {
  'ping': () => void;
  'pong': () => void;
}

// Helper types for event handling
export type EventName = keyof ServerToClientEvents | keyof ClientToServerEvents;
export type EventCallback<T extends EventName> = T extends keyof ServerToClientEvents 
  ? ServerToClientEvents[T] 
  : T extends keyof ClientToServerEvents 
    ? ClientToServerEvents[T] 
    : never;

// Type guard utilities
export function isHostId(value: unknown): value is HostId {
  return hostIdSchema.safeParse(value).success;
}

export function isSessionId(value: unknown): value is SessionId {
  return sessionIdSchema.safeParse(value).success;
}

export function isProcessId(value: unknown): value is ProcessId {
  return processIdSchema.safeParse(value).success;
}

// Event category type helpers
export type HostEventName = Extract<EventName, `host:${string}`>;
export type ProcessEventName = Extract<EventName, `process:${string}`>;
export type TerminalEventName = Extract<EventName, `terminal:${string}`>;
export type MetricsEventName = Extract<EventName, `metrics:${string}`>;
export type DockerEventName = Extract<EventName, `docker:${string}`>;
export type LogEventName = Extract<EventName, `logs:${string}`>;
export type NotificationEventName = Extract<EventName, `notification:${string}`>;
export type ChatEventName = Extract<EventName, `chat:${string}`>;
export type SystemEventName = 'error' | 'connect_error' | 'disconnect';
