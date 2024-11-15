import type { LogMetadata } from './logger';
import { logger } from '../server/utils/logger';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
    public readonly status: number = 500,
    public readonly metadata?: LogMetadata
  ) {
    super(message);
    this.name = 'ApiError';

    // Ensure instanceof works correctly
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      metadata: this.metadata,
      cause: this.cause,
    };
  }
}

export function createApiError(message: string, error: unknown, status = 500): ApiError {
  let cause: unknown;
  let metadata: LogMetadata = {};

  if (error instanceof Error) {
    cause = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
    metadata = {
      errorName: error.name,
      errorMessage: error.message,
    };
  } else {
    cause = error;
    metadata = {
      error: String(error),
    };
  }

  return new ApiError(message, cause, status, metadata);
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function extractErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function logError(error: unknown, context: string): void {
  if (error instanceof ApiError) {
    logger.error(`${context}:`, {
      message: error.message,
      status: error.status,
      metadata: error.metadata,
      cause: error.cause,
      stack: error.stack,
    });
  } else if (error instanceof Error) {
    logger.error(`${context}:`, {
      message: error.message,
      stack: error.stack,
    });
  } else {
    logger.error(`${context}:`, { error });
  }
}
