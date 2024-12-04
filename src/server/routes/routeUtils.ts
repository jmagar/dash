import express from 'express';
import { ApiError } from '../../types/error';
import { LoggingManager } from '../managers/LoggingManager';
import type { LogMetadata } from '../../types/logger';
import type { RequestHandler } from '../../types/express';

export function createRouter() {
  return express.Router();
}

export function createStandardErrorHandler(
  errorMessage: string, 
  logLevel: 'error' | 'warn' = 'error'
): RequestHandler {
  return async (req, res, next) => {
    try {
      await next();
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
        method: req.method,
        path: req.path,
      };

      LoggingManager.getInstance()[logLevel](errorMessage, metadata);

      const apiError = new ApiError(
        error instanceof Error ? error.message : errorMessage,
        undefined,
        500,
        metadata
      );

      return res.status(apiError.status).json({
        success: false,
        error: apiError.message,
      });
    }
  };
}

export function logRouteAccess(routeName: string, metadata?: LogMetadata) {
  LoggingManager.getInstance().info(`${routeName} route accessed:`, metadata || {});
}
