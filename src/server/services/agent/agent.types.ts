import type { AgentStatus } from '../../../types/agent-config';
import type { Socket } from 'socket.io';
import type { WebSocket } from 'ws';
import { ERROR_CODES } from './utils/constants';
import type { 
  ClientToServerEvents, 
  ServerToClientEvents, 
  InterServerEvents, 
  SocketData 
} from '../../../types/socket-events';

// Branded types for type safety
export type Brand<K, T> = K & { readonly __brand: T };
export type ConnectionId = Brand<string, 'ConnectionId'>;
export type AgentId = Brand<string, 'AgentId'>;

// Unit types for metrics
export type MetricUnit = 'percentage' | 'bytes' | 'bytesPerSecond';
export type MetricValue = Brand<number, 'MetricValue'>;
export type Timestamp = Brand<string, 'Timestamp'>;

// Strongly typed Socket.IO client
export type SocketIOClient = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

// Union type for all possible agent connections
export type AgentConnection = WebSocket | SocketIOClient;

// Resource metrics with strict validation
export interface ResourceMetrics {
  readonly value: MetricValue;
  readonly unit: MetricUnit;
  readonly timestamp: Timestamp;
}

// Network metrics with strict validation
export interface NetworkMetrics {
  readonly rx: ResourceMetrics & { readonly unit: 'bytesPerSecond' };
  readonly tx: ResourceMetrics & { readonly unit: 'bytesPerSecond' };
}

// Agent metrics with strict validation
export interface AgentMetrics {
  readonly cpu: ResourceMetrics & { readonly unit: 'percentage' };
  readonly memory: ResourceMetrics & { readonly unit: 'bytes' };
  readonly network: NetworkMetrics;
  readonly timestamp: Timestamp;
}

// Command execution with detailed result
export interface AgentCommandResult {
  readonly id: AgentId;
  readonly command: string;
  readonly args?: readonly string[];
  readonly exitCode: number;
  readonly stdout?: string;
  readonly stderr?: string;
  readonly error?: string;
  readonly timestamp: Timestamp;
}

// Agent capabilities as const enum for type safety
export const AGENT_CAPABILITIES = {
  SHELL_EXEC: 'shell:exec',
  FILE_TRANSFER: 'file:transfer',
  PROCESS_MANAGEMENT: 'process:manage',
  SYSTEM_INFO: 'system:info',
  NETWORK_SCAN: 'network:scan'
} as const;

export type AgentCapability = typeof AGENT_CAPABILITIES[keyof typeof AGENT_CAPABILITIES];

// Agent information with strict validation
export interface AgentInfo {
  readonly id: AgentId;
  readonly hostname: string;
  readonly platform: string;
  readonly arch: string;
  readonly version: string;
  readonly status: AgentStatus;
  readonly capabilities: readonly AgentCapability[];
  readonly lastSeen: Timestamp;
}

// Cache service with generics and error handling
export interface ICacheService<T> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  getMulti(keys: readonly string[]): Promise<ReadonlyMap<string, T | null>>;
  setMulti(entries: ReadonlyMap<string, T>, ttl?: number): Promise<void>;
}

// Detailed error tracking with strict validation
export interface AgentError {
  readonly timestamp: Date;
  readonly message: string;
  readonly code: keyof typeof ERROR_CODES;
  readonly details?: unknown;
  readonly stack?: string;
}

// Operation results with proper error typing
export interface AgentOperationResult<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: {
    readonly code: keyof typeof ERROR_CODES;
    readonly message: string;
    readonly details?: unknown;
  };
  readonly timestamp: Timestamp;
  readonly duration?: number;
}

// Enhanced state tracking with immutable properties
export interface AgentState {
  readonly info: AgentInfo;
  readonly connection: AgentConnection;
  readonly connectionId: ConnectionId;
  readonly lastHeartbeat: Date;
  readonly lastMetrics?: AgentMetrics;
  readonly lastSeen: Date;
  readonly connectionAttempts: number;
  readonly errors: readonly AgentError[];
  readonly status: AgentStatus;
  readonly pendingCommands: ReadonlySet<AgentId>;
  readonly features: ReadonlySet<AgentCapability>;
}

// Service metrics with strict validation
export interface AgentServiceMetrics {
  readonly totalAgents: number;
  readonly activeAgents: number;
  readonly disconnectedAgents: number;
  readonly erroredAgents: number;
  readonly averageResponseTime: number;
  readonly totalCommandsExecuted: number;
  readonly failedCommands: number;
  readonly averageHeartbeatLatency: number;
  readonly commandQueueLength: number;
  readonly agentsByStatus: Readonly<Record<AgentStatus, number>>;
  readonly errorsByCode: Readonly<Record<keyof typeof ERROR_CODES, number>>;
}

// Protocol messages with discriminated unions and readonly properties
export type AgentMessage = 
  | { readonly type: 'register'; readonly payload: AgentInfo }
  | { readonly type: 'heartbeat'; readonly payload: AgentMetrics }
  | { readonly type: 'metrics'; readonly payload: AgentMetrics }
  | { readonly type: 'command'; readonly payload: { readonly command: string; readonly args?: readonly string[] } }
  | { readonly type: 'command_response'; readonly payload: AgentCommandResult }
  | { readonly type: 'error'; readonly payload: { readonly code: keyof typeof ERROR_CODES; readonly message: string; readonly details?: unknown } };

// Type utilities for type safety
export type ExtractPayload<T extends AgentMessage['type']> = Extract<AgentMessage, { type: T }>['payload'];
export type ExtractMessage<T extends AgentMessage['type']> = Extract<AgentMessage, { type: T }>;

// Type guards for runtime type safety
export function isAgentCapability(value: unknown): value is AgentCapability {
  return typeof value === 'string' && Object.values(AGENT_CAPABILITIES).includes(value as AgentCapability);
}

export function isAgentId(value: unknown): value is AgentId {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function isConnectionId(value: unknown): value is ConnectionId {
  return typeof value === 'string' && value.length > 0;
}

export function isTimestamp(value: unknown): value is Timestamp {
  return typeof value === 'string' && !isNaN(Date.parse(value));
}

export function isMetricValue(value: unknown): value is MetricValue {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

export function isMetricUnit(value: unknown): value is MetricUnit {
  return value === 'percentage' || value === 'bytes' || value === 'bytesPerSecond';
}
