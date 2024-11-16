import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../../types/error';
import { logger } from '../utils/logger';

/**
 * Global error handling middleware
 */
export function errorHandler(error: Error, req: Request, res: Response, _next: NextFunction) {
  const statusCode = error instanceof ApiError ? error.status : 500;
  const metadata = {
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

  // Log critical errors (500s) with notification
  if (statusCode >= 500) {
    logger.critical('Server error encountered', {
      ...metadata,
      notify: true,
    });
  } else {
    logger.error('Request error:', metadata);
  }

  res.status(statusCode).json({
    success: false,
    error: error.message,
  });
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response) {
  const metadata = {
    path: req.path,
    method: req.method,
    requestId: req.requestId,
    userId: req.user?.id,
  };

  logger.warn('Route not found:', metadata);

  res.status(404).json({
    success: false,
    error: 'Not Found',
  });
}
