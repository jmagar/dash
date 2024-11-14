import type { LogMetadata } from '../../types/logger';

export enum RedisErrorCode {
  INVALID_CONFIG = 'INVALID_CONFIG',
  NOT_CONNECTED = 'NOT_CONNECTED',
  OPERATION_ERROR = 'OPERATION_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
}

export interface RedisErrorOptions {
  code: RedisErrorCode;
  message: string;
  metadata?: LogMetadata;
  cause?: Error;
}

export class RedisError extends Error {
  public readonly code: RedisErrorCode;
  public readonly metadata?: LogMetadata;
  public readonly cause?: Error;

  constructor(options: RedisErrorOptions) {
    super(options.message);
    this.name = 'RedisError';
    this.code = options.code;
    this.metadata = options.metadata;
    this.cause = options.cause;
  }
}

export function createConnectionError(error: unknown): RedisError {
  if (error instanceof Error) {
    return new RedisError({
      code: RedisErrorCode.CONNECTION_ERROR,
      message: 'Failed to connect to Redis',
      cause: error,
      metadata: { error: error.message },
    });
  }
  return new RedisError({
    code: RedisErrorCode.CONNECTION_ERROR,
    message: 'Failed to connect to Redis',
    metadata: { error: String(error) },
  });
}

export function createAuthenticationError(error: unknown): RedisError {
  if (error instanceof Error) {
    return new RedisError({
      code: RedisErrorCode.AUTHENTICATION_ERROR,
      message: 'Redis authentication failed',
      cause: error,
      metadata: { error: error.message },
    });
  }
  return new RedisError({
    code: RedisErrorCode.AUTHENTICATION_ERROR,
    message: 'Redis authentication failed',
    metadata: { error: String(error) },
  });
}

export const REDIS_ERROR_MESSAGES = {
  [RedisErrorCode.INVALID_CONFIG]: 'Invalid Redis configuration',
  [RedisErrorCode.NOT_CONNECTED]: 'Redis client is not connected',
  [RedisErrorCode.OPERATION_ERROR]: 'Redis operation failed',
  [RedisErrorCode.CONNECTION_ERROR]: 'Failed to connect to Redis',
  [RedisErrorCode.AUTHENTICATION_ERROR]: 'Redis authentication failed',
};
