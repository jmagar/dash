import type { ApiResult } from '../../types/api-shared';

export function handleApiError<T>(error: unknown): ApiResult<T> {
  if (error instanceof Error) {
    return {
      success: false,
      error: error.message,
    };
  }

  if (typeof error === 'string') {
    return {
      success: false,
      error,
    };
  }

  return {
    success: false,
    error: 'An unexpected error occurred',
  };
}
