export enum RedisErrorCode {
  CONNECTION_ERROR = 'REDIS_CONNECTION_ERROR',
  AUTHENTICATION_ERROR = 'REDIS_AUTH_ERROR',
  OPERATION_ERROR = 'REDIS_OPERATION_ERROR',
  OPERATION_FAILED = 'REDIS_OPERATION_FAILED',
  CONNECTION_FAILED = 'REDIS_CONNECTION_FAILED',
  TIMEOUT_ERROR = 'REDIS_TIMEOUT_ERROR',
  CLIENT_NOT_READY = 'REDIS_CLIENT_NOT_READY',
  METRICS_COLLECTION_ERROR = 'REDIS_METRICS_ERROR',
  MEMORY_LIMIT_EXCEEDED = 'REDIS_MEMORY_LIMIT_EXCEEDED',
  KEY_LIMIT_EXCEEDED = 'REDIS_KEY_LIMIT_EXCEEDED',
  INVALID_CONFIG = 'REDIS_INVALID_CONFIG',
  INVALID_DATA = 'REDIS_INVALID_DATA'
}

export const REDIS_ERROR_MESSAGES: Record<RedisErrorCode, string> = {
  [RedisErrorCode.CONNECTION_ERROR]: 'Failed to connect to Redis server',
  [RedisErrorCode.AUTHENTICATION_ERROR]: 'Redis authentication failed',
  [RedisErrorCode.OPERATION_ERROR]: 'Redis operation failed',
  [RedisErrorCode.OPERATION_FAILED]: 'Redis operation failed',
  [RedisErrorCode.CONNECTION_FAILED]: 'Redis connection failed',
  [RedisErrorCode.TIMEOUT_ERROR]: 'Redis operation timed out',
  [RedisErrorCode.CLIENT_NOT_READY]: 'Redis client is not ready',
  [RedisErrorCode.METRICS_COLLECTION_ERROR]: 'Failed to collect Redis metrics',
  [RedisErrorCode.MEMORY_LIMIT_EXCEEDED]: 'Redis memory limit exceeded',
  [RedisErrorCode.KEY_LIMIT_EXCEEDED]: 'Redis key limit exceeded',
  [RedisErrorCode.INVALID_CONFIG]: 'Invalid Redis configuration',
  [RedisErrorCode.INVALID_DATA]: 'Invalid data format'
};

export interface RedisErrorOptions {
  code: RedisErrorCode;
  message: string;
  cause?: Error;
  metadata?: Record<string, unknown>;
}

export class RedisError extends Error {
  public readonly code: RedisErrorCode;
  public readonly cause?: Error;
  public readonly metadata?: Record<string, unknown>;

  constructor(options: RedisErrorOptions) {
    super(options.message);
    this.name = 'RedisError';
    this.code = options.code;
    this.cause = options.cause;
    this.metadata = options.metadata;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, RedisError.prototype);
  }

  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      metadata: this.metadata,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined,
      cause: this.cause instanceof Error ? this.cause.message : this.cause,
    };
  }

  public static isRedisError(error: unknown): error is RedisError {
    return error instanceof RedisError;
  }

  public static fromError(error: Error, code = RedisErrorCode.OPERATION_ERROR): RedisError {
    return new RedisError({
      code,
      message: REDIS_ERROR_MESSAGES[code] || error.message,
      cause: error,
    });
  }
}

export const createConnectionError = (message: string, cause?: Error): RedisError => {
  return new RedisError({
    code: RedisErrorCode.CONNECTION_ERROR,
    message: message || REDIS_ERROR_MESSAGES[RedisErrorCode.CONNECTION_ERROR],
    cause,
  });
};

export const createAuthenticationError = (message: string, cause?: Error): RedisError => {
  return new RedisError({
    code: RedisErrorCode.AUTHENTICATION_ERROR,
    message: message || REDIS_ERROR_MESSAGES[RedisErrorCode.AUTHENTICATION_ERROR],
    cause,
  });
};

export const createTimeoutError = (operation: string, timeout: number): RedisError => {
  return new RedisError({
    code: RedisErrorCode.TIMEOUT_ERROR,
    message: REDIS_ERROR_MESSAGES[RedisErrorCode.TIMEOUT_ERROR],
    metadata: { operation, timeout },
  });
};

export const createMemoryLimitError = (used: number, limit: number): RedisError => {
  return new RedisError({
    code: RedisErrorCode.MEMORY_LIMIT_EXCEEDED,
    message: REDIS_ERROR_MESSAGES[RedisErrorCode.MEMORY_LIMIT_EXCEEDED],
    metadata: { used, limit },
  });
};

export const createKeyLimitError = (count: number, limit: number): RedisError => {
  return new RedisError({
    code: RedisErrorCode.KEY_LIMIT_EXCEEDED,
    message: REDIS_ERROR_MESSAGES[RedisErrorCode.KEY_LIMIT_EXCEEDED],
    metadata: { count, limit },
  });
};
