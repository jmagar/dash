import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { LoggingManager } from '../managers/utils/LoggingManager';
import { ApiError } from '../types/errors';
import { ApiErrorResponse } from '../types/common.dto';
import { AccessTokenPayloadDto, RefreshTokenPayloadDto } from '../routes/auth/dto/auth.dto';

// Extend Express Request type
export interface AuthenticatedRequest extends Request {
  user?: AccessTokenPayloadDto | RefreshTokenPayloadDto;
}

/**
 * Authenticate JWT token middleware
 */
export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    LoggingManager.getInstance().warn('No token provided', { path: req.path });
    const response: ApiErrorResponse = {
      success: false,
      message: 'No token provided',
      statusCode: 401,
      requestId: req.requestId
    };
    res.status(401).json(response);
    return;
  }

  const token = authHeader.split(' ')[1];
  void verifyToken(token)
    .then(payload => {
      if (payload.type !== 'access') {
        throw ApiError.unauthorized('Invalid token type');
      }
      (req as AuthenticatedRequest).user = payload ;
      next();
    })
    .catch(error => {
      LoggingManager.getInstance().warn('Authentication failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        path: req.path,
        method: req.method,
        ip: req.ip,
      });

      const response: ApiErrorResponse = {
        success: false,
        message: error instanceof ApiError ? error.message : 'Authentication failed',
        statusCode: error instanceof ApiError ? error.status : 401,
        requestId: req.requestId
      };

      res.status(response.statusCode).json(response);
    });
}

/**
 * Check user role middleware
 */
export function checkRole(requiredRole: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      const response: ApiErrorResponse = {
        success: false,
        message: 'User not authenticated',
        statusCode: 401,
        requestId: req.requestId
      };
      res.status(401).json(response);
      return;
    }

    if (user.role !== requiredRole) {
      LoggingManager.getInstance().warn('Insufficient role:', {
        required: requiredRole,
        actual: user.role,
        userId: user.id,
        path: req.path
      });

      const response: ApiErrorResponse = {
        success: false,
        message: 'Insufficient permissions',
        statusCode: 403,
        requestId: req.requestId
      };
      res.status(403).json(response);
      return;
    }

    next();
  };
}

/**
 * Check if user is accessing their own resources
 */
export function checkOwnership(userIdParam = 'userId') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;
    const resourceUserId = req.params[userIdParam];

    if (!user) {
      const response: ApiErrorResponse = {
        success: false,
        message: 'User not authenticated',
        statusCode: 401,
        requestId: req.requestId
      };
      res.status(401).json(response);
      return;
    }

    if (!resourceUserId) {
      const response: ApiErrorResponse = {
        success: false,
        message: 'User ID parameter not found',
        statusCode: 400,
        requestId: req.requestId
      };
      res.status(400).json(response);
      return;
    }

    if (user.id !== resourceUserId && user.role !== 'admin') {
      LoggingManager.getInstance().warn('Unauthorized resource access:', {
        userId: user.id,
        resourceUserId,
        path: req.path
      });

      const response: ApiErrorResponse = {
        success: false,
        message: 'Access denied',
        statusCode: 403,
        requestId: req.requestId
      };
      res.status(403).json(response);
      return;
    }

    next();
  };
}

// Export middleware
export const requireAuth = authenticateToken;
export const requireRole = checkRole;
export const requireOwnership = checkOwnership;


