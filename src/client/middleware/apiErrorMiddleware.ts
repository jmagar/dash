import type { Middleware, MiddlewareAPI } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';

import type { LogMetadata } from '../../types/logger';
import type { RootState, MiddlewareDispatch } from '../store/storeTypes';
import { logger } from '../utils/frontendLogger';

/**
 * Type guard to check if an error is an Axios error
 */
function isAxiosError(error: unknown): error is AxiosError {
  return error !== null &&
         typeof error === 'object' &&
         'isAxiosError' in error &&
         (error as AxiosError).isAxiosError === true;
}

/**
 * API error handling middleware for axios requests
 * Intercepts API errors and logs them with proper context
 */
export const apiErrorMiddleware: Middleware<
  Record<string, never>,
  RootState,
  MiddlewareDispatch
> = (_api: MiddlewareAPI<MiddlewareDispatch, RootState>) =>
  (next) =>
    (action) => {
    // Check if the action has a payload that's an axios error
      if (
        action &&
      typeof action === 'object' &&
      'error' in action &&
      action.error === true &&
      'payload' in action
      ) {
        const error = action.payload;

        if (isAxiosError(error)) {
          const metadata: LogMetadata = {
            component: 'API',
            action: 'type' in action ? action.type as string : 'unknown',
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            error: {
              message: error.message,
              name: error.name,
              stack: error.stack,
            },
          };

          // Log based on error status
          const status = error.response?.status;
          if (status) {
            if (status === 401 || status === 403) {
              logger.warn('API Authentication Error:', metadata);
            } else if (status >= 500) {
              logger.error('API Server Error:', metadata);
            } else if (status >= 400) {
              logger.error('API Client Error:', metadata);
            }
          } else if (error.code === 'ECONNABORTED') {
            logger.error('API Timeout Error:', metadata);
          } else if (error.code === 'ERR_NETWORK') {
            logger.error('API Network Error:', metadata);
          } else {
            logger.error('API Unknown Error:', metadata);
          }
        }
      }

      return next(action);
    };