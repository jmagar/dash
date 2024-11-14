import type { Application, Response, NextFunction } from 'express';

import { errorHandler, notFoundHandler } from './errorHandler';
import type { Request } from '../../types/express';
import type { LogMetadata } from '../../types/logger';
import { logger } from '../utils/logger';

/**
 * Configure global application handlers for logging, monitoring, and error handling
 */
export function configureApplicationHandlers(app: Application): void {
  // Add global error handling
  app.use(errorHandler);

  // Add 404 handler - should be after all routes
  app.use(notFoundHandler);

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    const metadata: LogMetadata = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    };
    logger.error('Uncaught Exception:', metadata);

    // Give logger time to write before exiting
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  // Handle unhandled rejections
  process.on('unhandledRejection', (reason: unknown) => {
    const metadata: LogMetadata = {
      error: reason instanceof Error ? {
        name: reason.name,
        message: reason.message,
        stack: reason.stack,
      } : {
        message: String(reason),
      },
    };
    logger.error('Unhandled Rejection:', metadata);
  });

  logger.info('Application handlers configured');
}

/**
 * Helper function to wrap async route handlers
 */
export function asyncHandler<P = unknown, ResBody = unknown, ReqBody = unknown>(
  fn: (
    req: Request<P, ResBody, ReqBody>,
    res: Response<ResBody>,
    next: NextFunction
  ) => Promise<void>,
): (
  req: Request<P, ResBody, ReqBody>,
  res: Response<ResBody>,
  next: NextFunction
) => void {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

/**
 * Helper function to create route-specific error handlers
 */
export function createRouteErrorHandler(routeName: string) {
  return (error: Error, req: Request, res: Response, next: NextFunction): void => {
    const metadata: LogMetadata = {
      route: routeName,
      requestId: req.requestId,
      userId: req.user?.id,
      method: req.method,
      url: req.url,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    };

    logger.error('Route Error:', metadata);
    next(error);
  };
}
