import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../types/errors';
import { LoggingManager } from '../utils/logging/LoggingManager';
import { ApiErrorResponse, ErrorDetail } from '../types/common.dto';
import { monitoringService } from '../services/monitoring';
import { ValidationError } from 'class-validator';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

/**
 * Global error handling middleware
 */
export function errorHandler(error: Error | unknown, req: Request, res: Response, _next: NextFunction) {
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
      LoggingManager.getInstance().error('API Error:', { error, ...metadata });
      void monitoringService.updateServiceStatus('api', {
        name: 'api',
        status: 'unhealthy',
        error: error.message,
        lastCheck: new Date()
      });
    } else {
      LoggingManager.getInstance().warn('API Error:', { error, ...metadata });
      if (statusCode === 429) {
        void monitoringService.updateServiceStatus('api', {
          name: 'api',
          status: 'degraded',
          error: error.message,
          lastCheck: new Date()
        });
      }
    }
  } else if (error instanceof ValidationError) {
    statusCode = 400;
    message = 'Validation Error';
    details = Object.values(error.constraints || {}).map(msg => ({
      field: error.property,
      message: msg,
      code: 'VALIDATION_ERROR'
    }));
    LoggingManager.getInstance().warn('Validation Error:', { error, ...metadata });
  } else if (error instanceof JsonWebTokenError || error instanceof TokenExpiredError) {
    statusCode = 401;
    message = error instanceof TokenExpiredError ? 'Token has expired' : 'Invalid token';
    LoggingManager.getInstance().warn('Authentication Error:', { error, ...metadata });
  } else if (error instanceof Error) {
    LoggingManager.getInstance().error('Unexpected Error:', {
      error: error.message,
      stack: error.stack,
      ...metadata
    });
    void monitoringService.updateServiceStatus('api', {
      name: 'api',
      status: 'unhealthy',
      error: error.message,
      lastCheck: new Date()
    });
  } else {
    LoggingManager.getInstance().error('Unknown Error:', {
      error,
      ...metadata
    });
    void monitoringService.updateServiceStatus('api', {
      name: 'api',
      status: 'unhealthy',
      error: 'Unknown error occurred',
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
export function notFoundHandler(req: Request, res: Response) {
  const error = ApiError.notFound(`Route ${req.path} not found`);
  
  LoggingManager.getInstance().warn('Route not found:', {
    path: req.path,
    method: req.method,
    requestId: req.requestId,
    userId: req.user?.id,
    query: req.query,
    headers: {
      'user-agent': req.get('user-agent'),
      'x-forwarded-for': req.get('x-forwarded-for'),
      'x-request-id': req.get('x-request-id'),
    }
  });

  const response: ApiErrorResponse = {
    success: false,
    message: error.message,
    statusCode: error.status,
    requestId: req.requestId
  };

  res.status(error.status).json(response);
}

