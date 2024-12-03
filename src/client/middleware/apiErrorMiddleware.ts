import type { Middleware, MiddlewareAPI, Dispatch } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';

import type { LogMetadata } from '../../types/logger';
import type { RootState } from '../store/storeTypes';
import { logger } from '../utils/frontendLogger';
import { LoggingManager } from '../../../../../../../../src/server/utils/logging/LoggingManager';

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
  Dispatch
> = (_api: MiddlewareAPI<Dispatch, RootState>) =>
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
              loggerLoggingManager.getInstance().();
            } else if (status >= 500) {
              loggerLoggingManager.getInstance().();
            } else if (status >= 400) {
              loggerLoggingManager.getInstance().();
            }
          } else if (error.code === 'ECONNABORTED') {
            loggerLoggingManager.getInstance().();
          } else if (error.code === 'ERR_NETWORK') {
            loggerLoggingManager.getInstance().();
          } else {
            loggerLoggingManager.getInstance().();
          }
        }
      }

      return next(action);
    };

