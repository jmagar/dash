import type { AxiosError } from 'axios';

import type { ApiResult } from './api-shared';
import { logger } from '../client/utils/frontendLogger';

interface ApiErrorResponse {
  error?: string;
  message?: string;
  details?: unknown;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details ?? null;

    // Ensure instanceof works correctly
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      details: this.details,
    };
  }
}

export function handleApiError<T>(error: unknown, context: string): ApiResult<T> {
  logger.error(`API error in ${context}:`, {
    error: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : undefined,
    context,
  });

  // Handle Axios errors
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    const errorMessage = axiosError.response?.data?.error ||
                        axiosError.response?.data?.message ||
                        axiosError.message ||
                        'An unknown error occurred';

    logger.error('Axios error details:', {
      status: axiosError.response?.status,
      statusText: axiosError.response?.statusText,
      data: axiosError.response?.data,
      config: {
        url: axiosError.config?.url,
        method: axiosError.config?.method,
        baseURL: axiosError.config?.baseURL,
      },
    });

    return {
      success: false,
      error: errorMessage,
    };
  }

  // Handle our custom API errors
  if (error instanceof ApiError) {
    logger.error('API error details:', {
      status: error.status,
      details: error.details,
      stack: error.stack,
    });

    return {
      success: false,
      error: error.message,
    };
  }

  // Handle standard errors
  if (error instanceof Error) {
    logger.error('Standard error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });

    return {
      success: false,
      error: error.message,
    };
  }

  // Handle unknown errors
  logger.error('Unknown error:', { error });
  return {
    success: false,
    error: 'An unexpected error occurred',
  };
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function createApiError(message: string, statusOrError: number | Error | unknown, details?: unknown): ApiError {
  if (typeof statusOrError === 'number') {
    return new ApiError(message, statusOrError, details);
  }

  if (statusOrError instanceof Error) {
    const errorDetails = {
      originalError: {
        message: statusOrError.message,
        stack: statusOrError.stack,
      },
      additionalDetails: details,
    };
    return new ApiError(message, 500, errorDetails);
  }

  // Handle unknown error types
  const errorDetails = {
    originalError: statusOrError,
    additionalDetails: details,
  };
  return new ApiError(message, 500, errorDetails);
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
