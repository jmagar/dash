import type { LogMetadata } from '../../../types/logger';
import { RedisError, RedisErrorCode } from '../../../types/redis';
import { errorAggregator } from '../../services/errorAggregator';

/**
 * Get a human-readable error message from an error object
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Get the appropriate error code for an error
 */
export function getErrorCode(error: unknown): RedisErrorCode {
  if (error instanceof RedisError) {
    return error.code;
  }
  return RedisErrorCode.OPERATION_ERROR;
}

/**
 * Wrap an error in a RedisError with consistent formatting
 */
export function wrapError(error: unknown, message: string, metadata?: Record<string, unknown>): RedisError {
  if (error instanceof RedisError) {
    return error;
  }

  const redisError = new RedisError({
    code: getErrorCode(error),
    message,
    cause: error instanceof Error ? error : undefined,
    metadata: {
      error: error instanceof Error ? error.message : String(error),
      ...metadata,
    },
  });

  // Track error in aggregator
  errorAggregator.trackError(redisError, redisError.metadata);

  return redisError;
}

/**
 * Standard error messages for Redis operations
 */
export const REDIS_ERROR_MESSAGES = {
  [RedisErrorCode.INVALID_CONFIG]: 'Invalid Redis configuration',
  [RedisErrorCode.NOT_CONNECTED]: 'Redis client is not connected',
  [RedisErrorCode.OPERATION_ERROR]: 'Redis operation failed',
  [RedisErrorCode.CONNECTION_ERROR]: 'Failed to connect to Redis',
  [RedisErrorCode.AUTHENTICATION_ERROR]: 'Redis authentication failed',
} as const;

/**
 * Create a standard Redis error with consistent formatting
 */
export function createRedisError(code: RedisErrorCode, metadata?: Record<string, unknown>): RedisError {
  return new RedisError({
    code,
    message: REDIS_ERROR_MESSAGES[code],
    metadata,
  });
}
