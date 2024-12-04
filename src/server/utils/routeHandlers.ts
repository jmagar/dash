import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../../types/error';
import { logRouteAccess } from '../routeUtils';
import { AuthenticatedRequest } from '../../types/express';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    context?: Record<string, unknown>;
  };
}

export function createApiResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data
  };
}

export function createErrorResponse(error: Error | ApiError | unknown, statusCode = 500): ApiResponse<null> {
  const message = error instanceof Error ? error.message : 'Internal server error';
  const context = error instanceof ApiError ? error.context : undefined;

  return {
    success: false,
    error: {
      message,
      context
    }
  };
}

type RouteHandler<T = any> = (
  req: AuthenticatedRequest,
  res: Response
) => Promise<T>;

export function wrapAsync(handler: RouteHandler) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await handler(req, res);
      if (!res.headersSent) {
        res.json(createApiResponse(result));
      }
    } catch (error) {
      const statusCode = error instanceof ApiError ? error.statusCode : 500;
      logRouteAccess('Route error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        path: req.path,
        method: req.method
      });
      
      if (!res.headersSent) {
        res.status(statusCode).json(createErrorResponse(error, statusCode));
      }
      next(error);
    }
  };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    const error = new ApiError('User not authenticated', 401);
    return res.status(401).json(createErrorResponse(error, 401));
  }
  next();
}
