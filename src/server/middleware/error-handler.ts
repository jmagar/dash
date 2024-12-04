import type { Application, Request, Response, NextFunction } from 'express';
import { ApiError } from '../types/errors';
import { LoggingManager } from '../managers/utils/LoggingManager';
import { ApiErrorResponse, ErrorDetail } from '../types/common.dto';
import { monitoringService } from '../services/monitoring';
import { ValidationError } from 'class-validator';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import type { LogMetadata } from '../types/logger';

const logger = LoggingManager.getInstance();

/**
 * Configure global error handlers for the application
 */
export function configureErrorHandlers(app: Application): void {
  // Global error handler
  app.use(errorHandler);

  // 404 handler - should be after all routes
  app.use(notFoundHandler);

  // Uncaught exception handler
  process.on('uncaughtException', (error: Error) => {
    const metadata: LogMetadata = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    };
    logger.error('Uncaught Exception:', metadata);

    void monitoringService.updateServiceStatus('api', {
      name: 'api',
      status: 'unhealthy',
      error: error.message,
      lastCheck: new Date()
    });

    // Give logger time to write before exiting
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  // Unhandled rejection handler
  process.on('unhandledRejection', (reason: unknown) => {
    const metadata: LogMetadata = {
      error: reason instanceof Error ? reason : String(reason)
    };
    logger.error('Unhandled Rejection:', metadata);

    void monitoringService.updateServiceStatus('api', {
      name: 'api',
      status: 'degraded',
      error: String(reason),
      lastCheck: new Date()
    });
  });

  logger.info('Error handlers configured');
}

/**
 * Global error handling middleware
 */
function errorHandler(error: Error | unknown, req: Request, res: Response, _next: NextFunction) {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details: ErrorDetail[] | undefined;

  // Log metadata for all errors
  const metadata = {
    path: req.path,
    method: req.method,
    requestId: req.requestId,
    userId: req.user?.id,
    query: req.query,
    body: req.body,
    params: req.params,
    headers: {
      'user-agent': req.get('user-agent'),
      'x-forwarded-for': req.get('x-forwarded-for'),
      'x-request-id': req.get('x-request-id'),
    }
  };

  // Handle different types of errors
  if (error instanceof ApiError) {
    statusCode = error.status;
    message = error.message;
    details = error.details;
    
    if (statusCode >= 500) {
      logger.error('API Error:', { error, ...metadata });
      void monitoringService.updateServiceStatus('api', {
        name: 'api',
        status: 'unhealthy',
        error: error.message,
        lastCheck: new Date()
      });
    } else {
      logger.warn('API Error:', { error, ...metadata });
      if (statusCode === 429) {
        void monitoringService.updateServiceStatus('api', {
          name: 'api',
          status: 'degraded',
          error: 'Rate limit exceeded',
          lastCheck: new Date()
        });
      }
    }
  } else if (error instanceof ValidationError) {
    statusCode = 400;
    message = 'Validation Error';
    details = [{
      field: error.property,
      message: Object.values(error.constraints || {}).join(', '),
      code: 'VALIDATION_ERROR'
    }];
    logger.warn('Validation Error:', { error, ...metadata });
  } else if (error instanceof JsonWebTokenError || error instanceof TokenExpiredError) {
    statusCode = 401;
    message = error instanceof TokenExpiredError ? 'Token expired' : 'Invalid token';
    logger.warn('Authentication Error:', { error, ...metadata });
  } else {
    logger.error('Unhandled Error:', { error, ...metadata });
    void monitoringService.updateServiceStatus('api', {
      name: 'api',
      status: 'unhealthy',
      error: message,
      lastCheck: new Date()
    });
  }

  const response: ApiErrorResponse = {
    success: false,
    message,
    statusCode,
    requestId: req.requestId,
    details
  };

  res.status(statusCode).json(response);
}

/**
 * 404 Not Found handler
 */
function notFoundHandler(req: Request, res: Response) {
  const error = ApiError.notFound(`Route ${req.path} not found`);
  
  logger.warn('Route not found:', {
    path: req.path,
    method: req.method,
    requestId: req.requestId,
    userId: req.user?.id
  });

  res.status(error.status).json({
    success: false,
    message: error.message,
    statusCode: error.status,
    requestId: req.requestId
  });
}

/**
 * Create route-specific error handler
 */
export function createRouteErrorHandler(routeName: string) {
  return function(error: Error, req: Request, res: Response, next: NextFunction) {
    logger.error(`Error in ${routeName}:`, {
      error,
      path: req.path,
      method: req.method,
      requestId: req.requestId,
      userId: req.user?.id
    });

    if (error instanceof ApiError) {
      next(error);
    } else {
      next(new ApiError('Internal Server Error', 500));
    }
  };
}

