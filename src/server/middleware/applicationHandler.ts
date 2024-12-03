import type { Application, Request, Response, NextFunction } from 'express';
import { ApiError } from '../../types/error';
import { errorHandler, notFoundHandler } from './error';
import type { LogMetadata } from '../../types/logger';
import { LoggingManager } from '../utils/logging/LoggingManager';

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
    LoggingManager.getInstance().error('Uncaught Exception:', metadata);

    // Give logger time to write before exiting
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  // Handle unhandled rejections
  process.on('unhandledRejection', (reason: unknown) => {
    const metadata: LogMetadata = {
      error: reason instanceof Error ? reason : String(reason)
    };
    LoggingManager.getInstance().error('Unhandled Rejection:', metadata);
  });

  LoggingManager.getInstance().info('Application handlers configured');
}

/**
 * Helper function to create route-specific error handlers
 * @param routeName - The name of the route for logging purposes
 * @returns A middleware function that handles errors for the specific route
 */
export function createRouteErrorHandler(routeName: string) {
  return function(error: Error, req: Request, res: Response, _next: NextFunction) {
    const metadata: LogMetadata = {
      route: routeName,
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

    LoggingManager.getInstance().error('Route error:', metadata);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  };
}

