import { z } from 'zod';
import type { 
  NotificationType, 
  Notification, 
  DesktopNotification, 
  NotificationPreferences 
} from './notification.types';
import type { 
  Host 
} from './models-shared';
import type { 
  ProcessInfo, 
  SystemMetrics, 
  ProcessMetrics 
} from './metrics.types';
import type { 
  DockerStats, 
  DockerContainer, 
  DockerComposeConfig 
} from './docker.types';
import type {
  HostId,
  SessionId,
  ProcessId,
  BaseEventPayload,
  BaseErrorPayload,
  BaseSuccessPayload,
  HostEventPayload,
  ProcessEventPayload,
  TerminalEventPayload
} from './socket.io';

// Log entry schema with strict validation
export const logEntrySchema = z.object({
  id: z.string().uuid(),
  timestamp: z.date(),
  level: z.enum(['debug', 'info', 'warn', 'error']),
  message: z.string(),
  metadata: z.record(z.unknown()).optional()
}).strict().readonly();

export type LogEntry = z.infer<typeof logEntrySchema>;

// Log filter schema with strict validation
export const logFilterSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  search: z.string().min(1).optional(),
  startTime: z.date().optional(),
  endTime: z.date().optional()
}).strict().readonly();

export type LogFilter = z.infer<typeof logFilterSchema>;

// Response schemas with strict validation
export const notificationPreferencesResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  data: z.object({
    preferences: z.custom<NotificationPreferences>().optional()
  }).optional()
}).strict().readonly();

export type NotificationPreferencesResponse = z.infer<typeof notificationPreferencesResponseSchema>;

// Agent info schema with strict validation
export const agentInfoSchema = z.object({
  id: z.string().uuid(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  hostname: z.string().min(1),
  platform: z.string().min(1),
  arch: z.string().min(1),
  status: z.enum(['connected', 'disconnected', 'error']),
  lastSeen: z.date(),
  error: z.string().optional()
}).strict().readonly();

export type AgentInfo = z.infer<typeof agentInfoSchema>;

// Agent metrics schema with strict validation
export const agentMetricsSchema = z.object({
  cpu: z.custom<SystemMetrics['cpu']>(),
  memory: z.custom<SystemMetrics['memory']>(),
  storage: z.custom<SystemMetrics['storage']>(),
  network: z.custom<SystemMetrics['network']>(),
  timestamp: z.date()
}).strict().readonly();

export type AgentMetrics = z.infer<typeof agentMetricsSchema>;

// Agent command result schema with strict validation
export const agentCommandResultSchema = z.object({
  success: z.boolean(),
  output: z.string().optional(),
  error: z.string().optional()
}).strict().readonly();

export type AgentCommandResult = z.infer<typeof agentCommandResultSchema>;

// Heartbeat info schema with strict validation
export const heartbeatInfoSchema = z.object({
  timestamp: z.date(),
  status: z.enum(['healthy', 'unhealthy']),
  error: z.string().optional()
}).strict().readonly();

export type HeartbeatInfo = z.infer<typeof heartbeatInfoSchema>;

// Socket data schema with strict validation
export const socketDataSchema = z.object({
  agentId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  hostId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  authenticated: z.boolean().optional()
}).strict().readonly();

export type SocketData = z.infer<typeof socketDataSchema>;

// Client to server events with strict typing
export interface ClientToServerEvents {
  // Host Events
  'host:connect': (payload: Readonly<{
    hostId: HostId;
  }> & BaseEventPayload, callback: (response: BaseSuccessPayload | BaseErrorPayload) => void) => void;
  'host:disconnect': (payload: Readonly<{
    hostId: HostId;
  }> & BaseEventPayload, callback: (response: BaseSuccessPayload | BaseErrorPayload) => void) => void;

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
  'process:error': (payload: ProcessEventPayload & BaseErrorPayload) => void;
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

  // System Events
  'error': (error: Error | string) => void;
  'connect_error': (error: Error) => void;
  'disconnect': (reason: string) => void;
  'ping': () => void;
  'pong': () => void;
}

// Inter-server events with strict typing
export interface InterServerEvents {
  ping: () => void;
  pong: () => void;
}

// Helper types for event handling
export type EventName = keyof ClientToServerEvents | keyof ServerToClientEvents;
export type EventCallback<T extends EventName> = T extends keyof ServerToClientEvents 
  ? ServerToClientEvents[T] 
  : T extends keyof ClientToServerEvents 
    ? ClientToServerEvents[T] 
    : never;

// Event category type helpers
export type HostEvents = Extract<EventName, `host:${string}`>;
export type ProcessEvents = Extract<EventName, `process:${string}`>;
export type TerminalEvents = Extract<EventName, `terminal:${string}`>;
export type MetricsEvents = Extract<EventName, `metrics:${string}`>;
export type DockerEvents = Extract<EventName, `docker:${string}`>;
export type LogEvents = Extract<EventName, `logs:${string}`>;
export type NotificationEvents = Extract<EventName, `notification:${string}`>;
export type SystemEvents = 'error' | 'connect_error' | 'disconnect' | 'ping' | 'pong';
