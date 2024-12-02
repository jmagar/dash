import { z } from 'zod';
import { ERROR_CODES } from './constants';
import type { 
  AgentId, 
  ConnectionId, 
  MetricValue, 
  Timestamp,
  AgentCapability,
  AgentMessage,
  ExtractMessage
} from '../agent.types';
import { AGENT_CAPABILITIES } from '../agent.types';

// Branded type validators
const agentIdSchema = z.string().uuid().brand<'AgentId'>();
const connectionIdSchema = z.string().min(1).brand<'ConnectionId'>();
const metricValueSchema = z.number().finite().brand<'MetricValue'>();
const timestampSchema = z.string().datetime().brand<'Timestamp'>();

// Unit type validators
const metricUnitSchema = z.enum(['percentage', 'bytes', 'bytesPerSecond']);
const agentCapabilitySchema = z.enum(Object.values(AGENT_CAPABILITIES) as [AgentCapability, ...AgentCapability[]]);

// Resource metrics schema with strict validation
export const ResourceMetricsSchema = z.object({
  value: metricValueSchema,
  unit: metricUnitSchema,
  timestamp: timestampSchema
}).readonly();

// Network metrics schema with strict validation
export const NetworkMetricsSchema = z.object({
  rx: ResourceMetricsSchema.extend({ unit: z.literal('bytesPerSecond') }),
  tx: ResourceMetricsSchema.extend({ unit: z.literal('bytesPerSecond') })
}).readonly();

// Agent metrics schema with strict validation
export const AgentMetricsSchema = z.object({
  cpu: ResourceMetricsSchema.extend({ unit: z.literal('percentage') }),
  memory: ResourceMetricsSchema.extend({ unit: z.literal('bytes') }),
  network: NetworkMetricsSchema,
  timestamp: timestampSchema
}).readonly();

// Command result schema with strict validation
export const AgentCommandResultSchema = z.object({
  id: agentIdSchema,
  command: z.string(),
  args: z.array(z.string()).optional(),
  exitCode: z.number().int(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  error: z.string().optional(),
  timestamp: timestampSchema
}).readonly();

// Agent info schema with strict validation
export const AgentInfoSchema = z.object({
  id: agentIdSchema,
  hostname: z.string(),
  platform: z.string(),
  arch: z.string(),
  version: z.string(),
  status: z.enum(['online', 'offline', 'error']),
  capabilities: z.array(agentCapabilitySchema),
  lastSeen: timestampSchema
}).readonly();

// Message schemas with discriminated unions
const RegisterMessageSchema = z.object({
  type: z.literal('register'),
  payload: AgentInfoSchema
}).readonly();

const HeartbeatMessageSchema = z.object({
  type: z.literal('heartbeat'),
  payload: AgentMetricsSchema
}).readonly();

const MetricsMessageSchema = z.object({
  type: z.literal('metrics'),
  payload: AgentMetricsSchema
}).readonly();

const CommandMessageSchema = z.object({
  type: z.literal('command'),
  payload: z.object({
    command: z.string(),
    args: z.array(z.string()).optional()
  }).readonly()
}).readonly();

const CommandResponseMessageSchema = z.object({
  type: z.literal('command_response'),
  payload: AgentCommandResultSchema
}).readonly();

const ErrorMessageSchema = z.object({
  type: z.literal('error'),
  payload: z.object({
    code: z.enum(Object.keys(ERROR_CODES) as [keyof typeof ERROR_CODES, ...Array<keyof typeof ERROR_CODES>]),
    message: z.string(),
    details: z.unknown().optional()
  }).readonly()
}).readonly();

// Combined message schema with discriminated union
export const AgentMessageSchema = z.discriminatedUnion('type', [
  RegisterMessageSchema,
  HeartbeatMessageSchema,
  MetricsMessageSchema,
  CommandMessageSchema,
  CommandResponseMessageSchema,
  ErrorMessageSchema
]);

// Type-safe validation functions
export function validateAgentId(value: unknown): AgentId {
  return agentIdSchema.parse(value);
}

export function validateConnectionId(value: unknown): ConnectionId {
  return connectionIdSchema.parse(value);
}

export function validateMetricValue(value: unknown): MetricValue {
  return metricValueSchema.parse(value);
}

export function validateTimestamp(value: unknown): Timestamp {
  return timestampSchema.parse(value);
}

export function validateAgentCapability(value: unknown): AgentCapability {
  return agentCapabilitySchema.parse(value);
}

export function validateAgentMessage(value: unknown): AgentMessage {
  return AgentMessageSchema.parse(value);
}

export function validateMessageByType<T extends AgentMessage['type']>(
  value: unknown, 
  type: T
): ExtractMessage<T> {
  const message = AgentMessageSchema.parse(value);
  if (message.type !== type) {
    throw new Error(`Invalid message type. Expected '${type}' but got '${message.type}'`);
  }
  return message as ExtractMessage<T>;
}

// Error handling utilities
export function createValidationError(code: keyof typeof ERROR_CODES, message: string, details?: unknown) {
  return {
    code,
    message,
    details,
    timestamp: new Date().toISOString() as Timestamp
  };
}

// Type guard utilities
export function isValidAgentId(value: unknown): value is AgentId {
  return agentIdSchema.safeParse(value).success;
}

export function isValidConnectionId(value: unknown): value is ConnectionId {
  return connectionIdSchema.safeParse(value).success;
}

export function isValidMetricValue(value: unknown): value is MetricValue {
  return metricValueSchema.safeParse(value).success;
}

export function isValidTimestamp(value: unknown): value is Timestamp {
  return timestampSchema.safeParse(value).success;
}

export function isValidAgentCapability(value: unknown): value is AgentCapability {
  return agentCapabilitySchema.safeParse(value).success;
}

export function isValidAgentMessage(value: unknown): value is AgentMessage {
  return AgentMessageSchema.safeParse(value).success;
}
