import type { ApiResult } from '../../types/api-shared';
import type { LogMetadata } from '../../types/logger';

export interface ApiError extends Error {
  status: number;
  metadata?: LogMetadata;
}

/**
 * Create an API error with status code and metadata
 */
export function createApiError(
  message: string,
  status = 500,
  metadata?: LogMetadata,
): ApiError {
  const error = new Error(message) as ApiError;
  error.status = status;
  error.metadata = metadata;
  return error;
}

/**
 * Convert any error to a standardized API response
 */
export function handleApiError<T>(error: unknown, defaultStatus = 500): ApiResult<T> {
  if (error instanceof Error) {
    const apiError = error as ApiError;
    return {
      success: false,
      error: apiError.message,
      status: apiError.status || defaultStatus,
      metadata: apiError.metadata,
    };
  }

  if (typeof error === 'string') {
    return {
      success: false,
      error,
      status: defaultStatus,
    };
  }

  return {
    success: false,
    error: 'An unexpected error occurred',
    status: defaultStatus,
  };
}

/**
 * Check if an error is an API error
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof Error && 'status' in error;
}
