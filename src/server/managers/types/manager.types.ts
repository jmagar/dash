import { z } from 'zod';
import type { EventEmitter } from 'events';
import type { Counter, Gauge, Histogram } from 'prom-client';
import type { LogMetadata } from '../../../types/logger';

// JSON Types
export type JsonPrimitive = string | number | boolean | null;
export type JsonArray = JsonValue[];
export type JsonObject = { [key: string]: JsonValue };
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

// Manager Names
export const ManagerNameEnum = {
  AGENT: 'AgentManager',
  LOGGING: 'LoggingManager',
  METRICS: 'MetricsManager',
  SECURITY: 'SecurityManager',
  CONFIG: 'ConfigManager',
  CACHE: 'CacheManager',
  DATABASE: 'DatabaseManager',
  EVENT: 'EventManager',
  FILE_SYSTEM: 'FileSystemManager',
  MONITORING: 'MonitoringManager',
  REQUEST: 'RequestManager',
  SERVICE: 'ServiceManager',
  STATE: 'StateManager',
  TASK: 'TaskManager',
  WEBSOCKET: 'WebSocketManager'
} as const;

export type ManagerName = typeof ManagerNameEnum[keyof typeof ManagerNameEnum];

// Manager Events
export interface ManagerEvent {
  type: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

// Manager Health
export interface ManagerHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  details?: Record<string, unknown>;
  lastError?: Error;
  metrics?: ManagerMetrics;
}

// Manager Metrics
export interface ManagerMetrics {
  counters: Map<string, Counter<string>>;
  gauges: Map<string, Gauge<string>>;
  histograms: Map<string, Histogram<string>>;
}

// Manager Errors
export interface ManagerError extends Error {
  code?: string;
  retryable?: boolean;
  metadata?: Record<string, unknown>;
}

// Operation Results
export interface ManagerOperationResult<T, E extends ManagerError = ManagerError> {
  success: boolean;
  data?: T;
  error?: E;
  metadata: {
    timestamp: Date;
    duration: number;
    source: string;
  };
}

// Base Manager Configuration
export const BaseManagerConfigSchema = z.object({
  name: z.enum([
    ManagerNameEnum.AGENT,
    ManagerNameEnum.LOGGING,
    ManagerNameEnum.METRICS,
    ManagerNameEnum.SECURITY,
    ManagerNameEnum.CONFIG,
    ManagerNameEnum.CACHE,
    ManagerNameEnum.DATABASE,
    ManagerNameEnum.EVENT,
    ManagerNameEnum.FILE_SYSTEM,
    ManagerNameEnum.MONITORING,
    ManagerNameEnum.REQUEST,
    ManagerNameEnum.SERVICE,
    ManagerNameEnum.STATE,
    ManagerNameEnum.TASK,
    ManagerNameEnum.WEBSOCKET
  ]),
  version: z.string(),
  metrics: z.boolean().optional().default(true),
  logging: z.boolean().optional().default(true),
  dependencies: z.array(z.enum([
    ManagerNameEnum.AGENT,
    ManagerNameEnum.LOGGING,
    ManagerNameEnum.METRICS,
    ManagerNameEnum.SECURITY,
    ManagerNameEnum.CONFIG,
    ManagerNameEnum.CACHE,
    ManagerNameEnum.DATABASE,
    ManagerNameEnum.EVENT,
    ManagerNameEnum.FILE_SYSTEM,
    ManagerNameEnum.MONITORING,
    ManagerNameEnum.REQUEST,
    ManagerNameEnum.SERVICE,
    ManagerNameEnum.STATE,
    ManagerNameEnum.TASK,
    ManagerNameEnum.WEBSOCKET
  ])).optional(),
  retryOptions: z.object({
    maxAttempts: z.number().int().positive(),
    initialDelay: z.number().int().positive(),
    maxDelay: z.number().int().positive(),
    factor: z.number().positive().optional().default(2)
  }).optional()
});

export type BaseManagerConfig = z.infer<typeof BaseManagerConfigSchema>;

// Manager Interface
export interface IManager {
  getName(): ManagerName;
  getVersion(): string;
  getHealth(): Promise<ManagerHealth>;
  on(event: string, listener: (data: ManagerEvent) => void): void;
  emit(event: string, data: ManagerEvent): void;
}

// Manager Dependencies Interface
export interface ManagerDependencies {
  [ManagerNameEnum.LOGGING]: {
    info(message: string, meta?: LogMetadata): void;
    warn(message: string, meta?: LogMetadata): void;
    error(message: string, meta?: LogMetadata): void;
    debug(message: string, meta?: LogMetadata): void;
  }
  [ManagerNameEnum.METRICS]: {
    createCounter(name: string, help: string): Counter<string>;
    createGauge(name: string, help: string): Gauge<string>;
    createHistogram(name: string, help: string): Histogram<string>;
    incrementCounter(name: string, labels?: Record<string, string>): void;
    setGauge(name: string, value: number, labels?: Record<string, string>): void;
  }
  [ManagerNameEnum.CONFIG]: {
    get<T extends JsonValue>(key: string, defaultValue?: T): Promise<T | undefined>;
    getConfig<T>(key: string, defaultValue?: T): Promise<T | undefined>;
  }
  [ManagerNameEnum.SECURITY]: {
    checkPermission(permission: string, context?: Record<string, unknown>): Promise<boolean>;
    isAllowedConnection(connectionDetails: Record<string, unknown>): Promise<boolean>;
  }
  [ManagerNameEnum.EVENT]: {
    on<T extends Record<string, unknown>>(event: string, handler: (data: T) => void): void;
    emit<T extends Record<string, unknown>>(event: string, data: T): void;
  }
}

// Type Guards
export function isManagerError(error: unknown): error is ManagerError {
  return error instanceof Error && 'code' in error;
}

export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) return true;
  if (['string', 'number', 'boolean'].includes(typeof value)) return true;
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).every(isJsonValue);
  }
  return false;
}

export function isManagerEvent(value: unknown): value is ManagerEvent {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    'timestamp' in value &&
    'data' in value &&
    value.timestamp instanceof Date &&
    typeof value.type === 'string' &&
    typeof value.data === 'object'
  );
}

export function isManagerHealth(value: unknown): value is ManagerHealth {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    'timestamp' in value &&
    ['healthy', 'degraded', 'unhealthy'].includes((value as ManagerHealth).status) &&
    value.timestamp instanceof Date
  );
}
