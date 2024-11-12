import type { AxiosError } from 'axios';

import type { ApiResult } from './api-shared';
import { logger } from '../client/utils/frontendLogger';

interface ApiErrorResponse {
  error?: string;
  message?: string;
}

export function handleApiError<T>(error: unknown, context: string): ApiResult<T> {
  logger.error(`API error in ${context}:`, {
    error: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : undefined,
    context,
  });

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

  // Handle non-Axios errors
  if (error instanceof Error) {
    return {
      success: false,
      error: error.message,
    };
  }

  // Handle unknown errors
  return {
    success: false,
    error: 'An unexpected error occurred',
  };
}
