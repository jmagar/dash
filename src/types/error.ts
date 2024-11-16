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

/**
 * Create an API error with status code and metadata
 */
export function createApiError(message: string, cause?: unknown, status = 500, metadata?: LogMetadata): ApiError {
  return new ApiError(message, cause, status, metadata);
}

export interface ApiResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
  metadata?: LogMetadata;
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
  if (error instanceof Error) {
    logger.error(`${context}:`, {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
  } else if (typeof error === 'string') {
    logger.error(`${context}:`, { error });
  } else {
    logger.error(`${context}:`, { error: 'Unknown error' });
  }
}
