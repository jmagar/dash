import { z } from 'zod';
import type { AgentStatus } from '../../../../types/agent-config';
import { ERROR_CODES } from '../utils/constants';
import { 
import { LoggingManager } from '../../../../../../../../../../../utils/logging/LoggingManager';
  agentInfoSchema, 
  agentMetricsSchema, 
  agentCommandResultSchema 
} from '../utils/validation';

// Branded types for type safety
const UUIDRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const messageIdSchema = z.string().uuid().brand<'MessageId'>();
type MessageId = z.infer<typeof messageIdSchema>;

// Base message schema with strict validation
const baseMessageSchema = z.object({
  id: messageIdSchema,
  timestamp: z.string().datetime(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),
  correlationId: z.string().uuid().optional(),
  retryCount: z.number().int().min(0).optional()
}).strict().readonly();

type BaseMessage = z.infer<typeof baseMessageSchema>;

// Message payload schemas with strict validation
const registerPayloadSchema = z.object({
  info: agentInfoSchema,
  capabilities: z.array(z.string()).min(1).readonly(),
  metadata: z.record(z.string(), z.unknown()).optional()
}).strict().readonly();

const metricsPayloadSchema = z.object({
  metrics: agentMetricsSchema,
  interval: z.number().int().positive(),
  tags: z.array(z.string()).readonly().optional()
}).strict().readonly();

const commandPayloadSchema = z.object({
  command: z.string().min(1),
  args: z.array(z.string()).readonly().optional(),
  timeout: z.number().positive().optional(),
  cwd: z.string().optional(),
  env: z.record(z.string(), z.string()).optional(),
  shell: z.boolean().optional()
}).strict().readonly();

const commandResultPayloadSchema = z.object({
  result: agentCommandResultSchema,
  duration: z.number().positive(),
  exitCode: z.number().int(),
  signal: z.string().optional()
}).strict().readonly();

const errorPayloadSchema = z.object({
  code: z.nativeEnum(ERROR_CODES),
  message: z.string(),
  details: z.unknown().optional(),
  stack: z.string().optional(),
  source: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional()
}).strict().readonly();

// Message type literals for discriminated union
const MESSAGE_TYPES = {
  register: 'register',
  metrics: 'metrics',
  command: 'command',
  command_result: 'command_result',
  error: 'error'
} as const;

type MessageType = typeof MESSAGE_TYPES[keyof typeof MESSAGE_TYPES];

// Message schemas with proper composition
const messageSchemas = {
  [MESSAGE_TYPES.register]: z.object({
    type: z.literal(MESSAGE_TYPES.register),
    payload: registerPayloadSchema
  }).strict().readonly(),
  [MESSAGE_TYPES.metrics]: z.object({
    type: z.literal(MESSAGE_TYPES.metrics),
    payload: metricsPayloadSchema
  }).strict().readonly(),
  [MESSAGE_TYPES.command]: z.object({
    type: z.literal(MESSAGE_TYPES.command),
    payload: commandPayloadSchema
  }).strict().readonly(),
  [MESSAGE_TYPES.command_result]: z.object({
    type: z.literal(MESSAGE_TYPES.command_result),
    payload: commandResultPayloadSchema
  }).strict().readonly(),
  [MESSAGE_TYPES.error]: z.object({
    type: z.literal(MESSAGE_TYPES.error),
    payload: errorPayloadSchema
  }).strict().readonly()
} as const;

type MessageSchemas = typeof messageSchemas;
type MessagePayloadSchemas = {
  [K in MessageType]: z.infer<MessageSchemas[K]['shape']['payload']>
};

const messagePayloadSchema = z.discriminatedUnion('type', Object.values(messageSchemas));
export const messageSchema = baseMessageSchema.merge(messagePayloadSchema).readonly();

// Export inferred types with proper type safety
export type Message = z.infer<typeof messageSchema>;
export type MessagePayload<T extends MessageType> = MessagePayloadSchemas[T];

// Type guards with proper error handling
export function isMessage(data: unknown): data is Message {
  const result = messageSchema.safeParse(data);
  if (!result.success) {
    consoleLoggingManager.getInstance().());
  }
  return result.success;
}

export function isMessageType<T extends MessageType>(
  message: Message,
  type: T
): message is Message & { type: T; payload: MessagePayload<T> } {
  return message.type === type;
}

// Validation functions with proper error handling
export function validateMessage(data: unknown): z.SafeParseReturnType<unknown, Message> {
  return messageSchema.safeParse(data);
}

export function validateMessagePayload<T extends MessageType>(
  message: Message,
  type: T
): z.SafeParseReturnType<unknown, MessagePayload<T>> {
  if (!isMessageType(message, type)) {
    return {
      success: false,
      error: new z.ZodError([{
        code: z.ZodIssueCode.invalid_type,
        expected: type,
        received: message.type,
        path: ['type'],
        message: `Expected message type '${type}' but received '${message.type}'`
      }])
    };
  }

  return messageSchemas[type].shape.payload.safeParse(message.payload);
}

// Message creation with proper type inference
export function createMessage<T extends MessageType>(
  type: T,
  payload: MessagePayload<T>,
  options: Partial<Omit<BaseMessage, 'id' | 'timestamp'>> = {}
): Message & { type: T; payload: MessagePayload<T> } {
  const id = crypto.randomUUID();
  if (!UUIDRegex.test(id)) {
    throw new Error('Failed to generate valid UUID');
  }

  const message = {
    id: messageIdSchema.parse(id),
    timestamp: new Date().toISOString(),
    type,
    payload,
    ...options
  };
  
  const result = messageSchema.safeParse(message);
  if (!result.success) {
    throw new Error(`Invalid message: ${result.error.message}`);
  }
  
  return result.data as Message & { type: T; payload: MessagePayload<T> };
}

// Error message creation with proper type inference
export function createErrorMessage(
  code: keyof typeof ERROR_CODES,
  message: string,
  options: {
    details?: unknown;
    stack?: string;
    source?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    correlationId?: string;
  } = {}
): Message & { type: 'error'; payload: MessagePayload<'error'> } {
  const { correlationId, ...errorOptions } = options;
  const errorPayload = errorPayloadSchema.parse({
    code,
    message,
    ...errorOptions
  });
  
  return createMessage('error', errorPayload, { correlationId });
}

// Export schemas for reuse
export {
  messageIdSchema,
  baseMessageSchema,
  registerPayloadSchema,
  metricsPayloadSchema,
  commandPayloadSchema,
  commandResultPayloadSchema,
  errorPayloadSchema,
  MESSAGE_TYPES
};

