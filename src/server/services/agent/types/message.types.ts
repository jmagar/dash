import { z } from 'zod';
import { ERROR_CODES } from '../utils/constants';
import { LoggingManager } from '../../../managers/LoggingManager';
import { LoggerAdapter } from '../../../utils/logging/logger.adapter';
import type { Logger, LogMetadata, LogContext } from '../../../../types/logger';
import { 
  AgentInfoSchema, 
  AgentMetricsSchema, 
  AgentCommandResultSchema 
} from '../utils/validation';

// Create logger instance with proper context
const baseLogger = LoggingManager.getInstance();
const logger = new LoggerAdapter(baseLogger, {
  component: 'MessageTypes',
  service: 'AgentService'
}) as Logger;

// Branded types for type safety
const UUIDRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const messageIdSchema = z.string().uuid().brand<'MessageId'>();

// Base message schema with strict validation
const baseMessageSchema = z.object({
  id: messageIdSchema,
  timestamp: z.string().datetime(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),
  correlationId: z.string().uuid().optional(),
  retryCount: z.number().int().min(0).optional()
}).strict();

type BaseMessage = z.infer<typeof baseMessageSchema>;

// Message payload schemas with strict validation
const registerPayloadSchema = z.object({
  info: AgentInfoSchema,
  capabilities: z.array(z.string()).min(1),
  metadata: z.record(z.string(), z.unknown()).optional()
}).strict();

const metricsPayloadSchema = z.object({
  metrics: AgentMetricsSchema,
  interval: z.number().int().positive(),
  tags: z.array(z.string()).optional()
}).strict();

const commandPayloadSchema = z.object({
  command: z.string().min(1),
  args: z.array(z.string()).optional(),
  timeout: z.number().positive().optional(),
  cwd: z.string().optional(),
  env: z.record(z.string(), z.string()).optional(),
  shell: z.boolean().optional()
}).strict();

const commandResultPayloadSchema = z.object({
  result: AgentCommandResultSchema,
  duration: z.number().positive(),
  exitCode: z.number().int(),
  signal: z.string().optional()
}).strict();

const errorPayloadSchema = z.object({
  code: z.nativeEnum(ERROR_CODES),
  message: z.string(),
  details: z.unknown().optional(),
  stack: z.string().optional(),
  source: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional()
}).strict();

// Message type literals for discriminated union
const MESSAGE_TYPES = {
  register: 'register',
  metrics: 'metrics',
  command: 'command',
  command_result: 'command_result',
  error: 'error'
} as const;

type MessageType = typeof MESSAGE_TYPES[keyof typeof MESSAGE_TYPES];

// Create full message schema
export const messageSchema = z.object({
  ...baseMessageSchema.shape,
  type: z.enum([
    MESSAGE_TYPES.register,
    MESSAGE_TYPES.metrics,
    MESSAGE_TYPES.command,
    MESSAGE_TYPES.command_result,
    MESSAGE_TYPES.error
  ]),
  payload: z.union([
    registerPayloadSchema,
    metricsPayloadSchema,
    commandPayloadSchema,
    commandResultPayloadSchema,
    errorPayloadSchema
  ])
}).strict();

// Export inferred types with proper type safety
export type Message = z.infer<typeof messageSchema>;
export type MessagePayload<T extends MessageType> = T extends typeof MESSAGE_TYPES.register
  ? z.infer<typeof registerPayloadSchema>
  : T extends typeof MESSAGE_TYPES.metrics
  ? z.infer<typeof metricsPayloadSchema>
  : T extends typeof MESSAGE_TYPES.command
  ? z.infer<typeof commandPayloadSchema>
  : T extends typeof MESSAGE_TYPES.command_result
  ? z.infer<typeof commandResultPayloadSchema>
  : T extends typeof MESSAGE_TYPES.error
  ? z.infer<typeof errorPayloadSchema>
  : never;

// Type guards with proper error handling
export function isMessage(data: unknown): data is Message {
  const context: LogContext = {
    operation: 'isMessage',
    component: 'MessageTypes'
  };
  const methodLogger = logger.withContext(context);

  const result = messageSchema.safeParse(data);
  if (!result.success) {
    const metadata: LogMetadata = {
      error: new Error(result.error.message),
      component: 'MessageTypes',
      operation: 'isMessage',
      validationErrors: result.error.errors
    };
    methodLogger.error('Message validation failed', metadata);
  } else {
    methodLogger.debug('Message validation successful', {
      component: 'MessageTypes',
      operation: 'isMessage'
    });
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
  const context: LogContext = {
    operation: 'validateMessage',
    component: 'MessageTypes'
  };
  const methodLogger = logger.withContext(context);

  const result = messageSchema.safeParse(data);
  if (!result.success) {
    const metadata: LogMetadata = {
      error: new Error(result.error.message),
      component: 'MessageTypes',
      operation: 'validateMessage',
      validationErrors: result.error.errors
    };
    methodLogger.warn('Message validation failed', metadata);
  }
  return result;
}

export function validateMessagePayload<T extends MessageType>(
  type: T,
  payload: unknown
): z.SafeParseReturnType<unknown, MessagePayload<T>> {
  const context: LogContext = {
    operation: 'validateMessagePayload',
    component: 'MessageTypes',
    messageType: type
  };
  const methodLogger = logger.withContext(context);

  const getSchema = (t: T) => {
    switch (t) {
      case MESSAGE_TYPES.register:
        return registerPayloadSchema;
      case MESSAGE_TYPES.metrics:
        return metricsPayloadSchema;
      case MESSAGE_TYPES.command:
        return commandPayloadSchema;
      case MESSAGE_TYPES.command_result:
        return commandResultPayloadSchema;
      case MESSAGE_TYPES.error:
        return errorPayloadSchema;
      default:
        throw new Error(`Invalid message type: ${t}`);
    }
  };

  try {
    const schema = getSchema(type);
    const result = schema.safeParse(payload);
    if (!result.success) {
      const metadata: LogMetadata = {
        error: new Error(result.error.message),
        component: 'MessageTypes',
        operation: 'validateMessagePayload',
        messageType: type,
        validationErrors: result.error.errors
      };
      methodLogger.warn('Payload validation failed', metadata);
    }
    return result as z.SafeParseReturnType<unknown, MessagePayload<T>>;
  } catch (error) {
    const metadata: LogMetadata = {
      error: error instanceof Error ? error : new Error(String(error)),
      component: 'MessageTypes',
      operation: 'validateMessagePayload',
      messageType: type
    };
    methodLogger.error('Schema lookup failed', metadata);
    throw error;
  }
}

// Message creation with proper error handling and logging
export function createMessage<T extends MessageType>(
  type: T,
  payload: MessagePayload<T>,
  options: Partial<Omit<BaseMessage, 'id' | 'timestamp'>> = {}
): Message & { type: T; payload: MessagePayload<T> } {
  const context: LogContext = {
    operation: 'createMessage',
    component: 'MessageTypes',
    messageType: type
  };
  const methodLogger = logger.withContext(context);

  try {
    const startTime = Date.now();
    const id = crypto.randomUUID();
    if (!UUIDRegex.test(id)) {
      const error = new Error('Failed to generate valid UUID');
      methodLogger.error('UUID generation failed', {
        error,
        component: 'MessageTypes',
        operation: 'createMessage',
        generatedId: id
      });
      throw error;
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
      const metadata: LogMetadata = {
        error: new Error(result.error.message),
        component: 'MessageTypes',
        operation: 'createMessage',
        messageType: type,
        validationErrors: result.error.errors
      };
      methodLogger.error('Message creation failed', metadata);
      throw new Error(`Invalid message: ${result.error.message}`);
    }
    
    const duration = Date.now() - startTime;
    methodLogger.info('Message created successfully', {
      component: 'MessageTypes',
      operation: 'createMessage',
      messageId: message.id,
      correlationId: options.correlationId,
      timing: { total: duration }
    });

    return result.data as Message & { type: T; payload: MessagePayload<T> };
  } catch (error: unknown) {
    const metadata: LogMetadata = {
      error: error instanceof Error ? error : new Error(String(error)),
      component: 'MessageTypes',
      operation: 'createMessage',
      messageType: type
    };
    methodLogger.error('Message creation failed', metadata);
    throw error;
  }
}

// Error message creation with proper logging
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
  const context: LogContext = {
    operation: 'createErrorMessage',
    component: 'MessageTypes',
    errorCode: code
  };
  const methodLogger = logger.withContext(context);

  try {
    const startTime = Date.now();
    const { correlationId, ...errorOptions } = options;
    const errorPayload = {
      code: ERROR_CODES[code],
      message,
      ...errorOptions
    };
    
    const result = createMessage('error', errorPayload, { correlationId });
    
    const duration = Date.now() - startTime;
    methodLogger.info('Error message created', {
      component: 'MessageTypes',
      operation: 'createErrorMessage',
      messageId: result.id,
      errorCode: code,
      correlationId,
      timing: { total: duration }
    });

    return result;
  } catch (error: unknown) {
    const metadata: LogMetadata = {
      error: error instanceof Error ? error : new Error(String(error)),
      component: 'MessageTypes',
      operation: 'createErrorMessage',
      errorCode: code
    };
    methodLogger.error('Error message creation failed', metadata);
    throw error;
  }
}
