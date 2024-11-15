import { logger } from '../server/utils/logger';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
    public readonly status: number = 500,
    public readonly details?: unknown
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
      details: this.details,
      cause: this.cause,
    };
  }
}

export type LogMetadata = Record<string, string | number | boolean | null | undefined>;

export interface ApiResult<T> {
  data: T;
  error?: string;
}

export function createApiError(message: string, cause: unknown, status = 500): ApiError {
  return new ApiError(message, cause, status);
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
      details: error.details,
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
