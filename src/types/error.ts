import { AxiosError } from 'axios';

import type { ApiResult } from './api-shared';
import { logger } from '../client/utils/frontendLogger';

interface ApiErrorResponse {
  error?: string;
  message?: string;
  details?: unknown;
}

export function handleApiError<T>(error: unknown, context?: string): ApiResult<T> {
  // Log the error with context
  const errorContext = context ? ` in ${context}` : '';
  logger.error(`API Error${errorContext}:`, { error });

  // Handle Axios errors
  if (error instanceof AxiosError) {
    const response = error.response?.data as ApiErrorResponse | undefined;
    const status = error.response?.status;

    // Log detailed error information
    logger.error('API Request Failed:', {
      status,
      url: error.config?.url,
      method: error.config?.method,
      response: response,
      error: error.message,
    });

    // Handle specific status codes
    switch (status) {
      case 400:
        return {
          success: false,
          error: response?.error || response?.message || 'Invalid request. Please check your input.',
        };
      case 401:
        return {
          success: false,
          error: 'Authentication required. Please log in.',
        };
      case 403:
        return {
          success: false,
          error: 'You do not have permission to perform this action.',
        };
      case 404:
        return {
          success: false,
          error: response?.error || 'The requested resource was not found.',
        };
      case 500:
        return {
          success: false,
          error: 'An internal server error occurred. Please try again later.',
        };
      default:
        return {
          success: false,
          error: response?.error || response?.message || error.message || 'An unexpected error occurred',
        };
    }
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return {
      success: false,
      error: error.message,
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      success: false,
      error,
    };
  }

  // Handle unknown errors
  return {
    success: false,
    error: 'An unexpected error occurred',
  };
}
