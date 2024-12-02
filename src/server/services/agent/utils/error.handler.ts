import { logger } from '../../../utils/logger';
import type { LogMetadata } from '../../../../types/logger';
import { ApiError } from '../../../../types/error';
import { ERROR_CODES, LOG_METADATA } from './constants';
import { z } from 'zod';

// Strict error context typing
export interface ErrorContext extends Record<string, unknown> {
  readonly code?: keyof typeof ERROR_CODES;
  readonly [LOG_METADATA.AGENT_ID]?: string;
  readonly [LOG_METADATA.CONNECTION_TYPE]?: 'websocket' | 'socketio';
  readonly [LOG_METADATA.MESSAGE_TYPE]?: string;
  readonly [LOG_METADATA.SOCKET_ID]?: string;
}

// Error details schema for validation
const errorDetailsSchema = z.object({
  message: z.string(),
  code: z.nativeEnum(ERROR_CODES),
  details: z.unknown().optional(),
  stack: z.string().optional()
}).strict();

type ErrorDetails = z.infer<typeof errorDetailsSchema>;

export function handleError(error: Error | ApiError | unknown, context: ErrorContext = {}): void {
  const errorCode = context.code || ERROR_CODES.INTERNAL_ERROR;
  
  const metadata: LogMetadata = {
    [LOG_METADATA.ERROR]: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    code: errorCode,
    ...context
  };

  if (error instanceof ApiError) {
    metadata.details = error.details;
  }

  logger.error('Agent service error:', metadata);
}

export function handleApiError(
  error: Error | ApiError | unknown, 
  message: string, 
  context: ErrorContext = {}
): never {
  handleError(error, context);
  
  if (error instanceof ApiError) {
    throw error;
  }
  
  throw new ApiError(message, {
    code: context.code || ERROR_CODES.INTERNAL_ERROR,
    details: {
      originalError: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context
    }
  });
}

export function createApiError(
  message: string,
  code: keyof typeof ERROR_CODES,
  details?: Record<string, unknown>
): ApiError {
  const errorDetails: ErrorDetails = {
    message,
    code: ERROR_CODES[code],
    details
  };

  const validation = errorDetailsSchema.safeParse(errorDetails);
  if (!validation.success) {
    throw new Error(`Invalid error details: ${validation.error.message}`);
  }

  return new ApiError(message, errorDetails);
}
