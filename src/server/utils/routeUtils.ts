import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApiError } from '../../types/error';
import { LoggingManager } from '../managers/utils/LoggingManager';
import { monitoringService } from '../services/monitoring';
import { validate } from '../middleware/validate';

export interface RouteConfig<T = unknown> {
  schema?: z.ZodSchema;
  requireAuth?: boolean;
  roles?: string[];
}

export function createRouteHandler<T = unknown>(
  handler: (req: Request, res: Response) => Promise<T>,
  config: RouteConfig<T> = {}
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const requestId = req.requestId || crypto.randomUUID();

    try {
      // Validate request if schema provided
      if (config.schema) {
        await validate(config.schema)(req, res, () => {});
      }

      // Execute handler
      const result = await handler(req, res);

      // Log success
      const duration = Date.now() - startTime;
      LoggingManager.getInstance().info('Request completed', {
        requestId,
        method: req.method,
        path: req.path,
        duration,
        userId: req.user?.id
      });

      // Send response if not already sent
      if (!res.headersSent) {
        res.json({
          success: true,
          data: result
        });
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log error with context
      LoggingManager.getInstance().error('Request failed', {
        requestId,
        method: req.method,
        path: req.path,
        duration,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userId: req.user?.id
      });

      // Update monitoring status for server errors
      if (error instanceof ApiError && error.status >= 500) {
        void monitoringService.updateServiceStatus('api', {
          name: 'api',
          status: 'unhealthy',
          error: error.message,
          lastCheck: new Date()
        });
      }

      // Pass error to global error handler
      next(error);
    }
  };
}

export function createRouter() {
  const express = require('express');
  return express.Router();
}

export function logRouteAccess(message: string, metadata: Record<string, unknown> = {}) {
  LoggingManager.getInstance().info(message, metadata);
}
