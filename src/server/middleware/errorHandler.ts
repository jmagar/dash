import type { Request, Response, NextFunction } from 'express';

import { createApiError } from '../../types/error';
import type { LogMetadata } from '../../types/logger';
import { logger } from '../utils/logger';

/**
 * Global error handler middleware
 */
export function errorHandler(error: Error, req: Request, res: Response, next: NextFunction) {
  const metadata: LogMetadata = {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    path: req.path,
    method: req.method,
    requestId: req.requestId,
    userId: req.user?.id,
  };

  logger.error('Unhandled error:', metadata);

  const apiError = createApiError(error.message, 500, metadata);
  res.status(apiError.status || 500).json({
    success: false,
    error: apiError.message,
  });
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response) {
  const metadata: LogMetadata = {
    path: req.path,
    method: req.method,
    requestId: req.requestId,
    userId: req.user?.id,
  };

  logger.warn('Route not found:', metadata);

  const error = createApiError('Route not found', 404, metadata);
  res.status(404).json({
    success: false,
    error: error.message,
  });
}
