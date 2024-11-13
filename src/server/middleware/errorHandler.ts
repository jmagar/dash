import type { Request, Response, NextFunction } from 'express';

import { createApiError, type ApiError } from '../../types/error';
import type { LogMetadata } from '../../types/logger';
import { logger } from '../utils/logger';

interface ValidationError extends Error {
  name: 'ValidationError';
  errors?: Record<string, unknown>;
}

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const metadata: LogMetadata = {
    path: req.path,
    method: req.method,
    error: error.message,
    stack: error.stack,
  };

  // Handle API Errors
  if (error.name === 'APIError') {
    const apiError = error as ApiError;
    logger.warn('API Error:', {
      ...metadata,
      status: apiError.status,
      details: apiError.details,
    });

    res.status(apiError.status || 500).json({
      success: false,
      error: error.message,
      status: apiError.status,
      details: apiError.details,
    });
    return;
  }

  // Handle Validation Errors
  if (error.name === 'ValidationError') {
    const validationError = error as ValidationError;
    const details = {
      errors: validationError.errors,
    };

    logger.warn('Validation Error:', {
      ...metadata,
      details,
    });

    res.status(400).json({
      success: false,
      error: 'Validation failed',
      status: 400,
      details,
    });
    return;
  }

  // Handle Resource Not Found
  if (error.message.toLowerCase().includes('not found')) {
    logger.warn('Resource not found:', metadata);

    const apiError = createApiError(error.message, 404, metadata);
    res.status(404).json({
      success: false,
      error: apiError.message,
      status: apiError.status,
      details: apiError.details,
    });
    return;
  }

  // Handle unknown errors
  logger.error('Unhandled Error:', metadata);

  const apiError = createApiError(
    'An unexpected error occurred',
    500,
    metadata,
  );

  res.status(500).json({
    success: false,
    error: apiError.message,
    status: apiError.status,
    details: apiError.details,
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  const metadata: LogMetadata = {
    path: req.path,
    method: req.method,
  };
  logger.warn('Resource not found:', metadata);

  const apiError = createApiError(
    `Resource not found: ${req.path}`,
    404,
    metadata,
  );

  res.status(404).json({
    success: false,
    error: apiError.message,
    status: apiError.status,
    details: apiError.details,
  });
}
