﻿import { logger } from '../logger';
import type { LogMetadata } from '../../../types/logger';
import { ApiError } from '../../../types/error';
import { LoggingManager } from '../logging/LoggingManager';

export interface ErrorContext {
  code?: string;
  details?: Record<string, unknown>;
  metadata?: LogMetadata;
}

/**
 * Unified error handler for consistent error handling across the application
 */
export function handleError(
  error: Error | ApiError | unknown,
  context: ErrorContext = {}
): void {
  const metadata: LogMetadata = {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    code: context.code,
    ...context.metadata
  };

  if (error instanceof ApiError) {
    metadata.details = error.details;
  }

  loggerLoggingManager.getInstance().();
}

/**
 * Convert any error to an ApiError with consistent formatting
 */
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
    code: context.code || 'INTERNAL_ERROR',
    details: {
      originalError: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...context.details
    }
  });
}

/**
 * Create a validation error with consistent formatting
 */
export function createValidationError(
  message: string,
  details?: Record<string, unknown>
): ApiError {
  return new ApiError(message, {
    code: 'VALIDATION_ERROR',
    details
  });
}
