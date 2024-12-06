import type { LogMetadata, LogContext } from '../../types/logger';
import { LoggingManager } from '../managers/LoggingManager';
import { LoggerAdapter } from './logging/logger.adapter';
import { extractErrorMessage, createApiError, ApiError } from '../../types/error';

// Re-export error types and functions
export { createApiError, ApiError };

// Create a singleton logger for error handling
const errorLogger = new LoggerAdapter(LoggingManager.getInstance(), {
  component: 'ErrorHandler',
  service: 'ErrorService'
});

/**
 * Log an error with proper context and metadata
 */
export function logError(error: unknown, context: string): void {
  const methodLogger = errorLogger.withContext({
    operation: 'logError',
    context
  });

  const metadata: LogMetadata = {
    error: error instanceof Error ? error : new Error(String(error)),
    context
  };

  if (error instanceof Error) {
    if ('status' in error) {
      metadata.status = (error as { status: number }).status;
    }
    if ('cause' in error) {
      metadata.cause = (error as { cause: unknown }).cause;
    }
    if ('metadata' in error) {
      Object.assign(metadata, (error as { metadata: LogMetadata }).metadata);
    }
  }

  methodLogger.error('Error occurred', metadata);
}

/**
 * Log an error with additional context and return a formatted error message
 */
export function handleError(error: unknown, context: string): string {
  logError(error, context);
  return extractErrorMessage(error);
}

/**
 * Log an error with timing information
 */
export function logErrorWithTiming(error: unknown, context: string, startTime: number): void {
  const duration = Date.now() - startTime;
  const methodLogger = errorLogger.withContext({
    operation: 'logErrorWithTiming',
    context
  });

  const metadata: LogMetadata = {
    error: error instanceof Error ? error : new Error(String(error)),
    context,
    timing: { total: duration }
  };

  if (error instanceof Error) {
    if ('status' in error) {
      metadata.status = (error as { status: number }).status;
    }
    if ('cause' in error) {
      metadata.cause = (error as { cause: unknown }).cause;
    }
    if ('metadata' in error) {
      Object.assign(metadata, (error as { metadata: LogMetadata }).metadata);
    }
  }

  methodLogger.error('Operation failed', metadata);
}

/**
 * Create a logger context with error information
 */
export function createErrorContext(error: unknown, baseContext: LogContext = {}): LogContext {
  const context: LogContext = { ...baseContext };

  if (error instanceof Error) {
    context.error = error.message;
    if ('status' in error) {
      context.status = (error as { status: number }).status;
    }
    if ('code' in error) {
      context.code = (error as { code: string }).code;
    }
  } else {
    context.error = String(error);
  }

  return context;
}
