import type { Response, NextFunction } from 'express';

import { createApiError } from '../../types/error';
import type { Request, AuthenticatedRequest, AuthMiddleware } from '../../types/express';
import type { LogMetadata } from '../../types/logger';
import type { ApiResponse } from '../../types/models-shared';
import { verifyToken } from '../utils/jwt';
import { logger } from '../utils/logger';

function validateToken(token: unknown): token is string {
  return typeof token === 'string' && token.trim().length > 0;
}

function validateDecodedToken(decoded: unknown): decoded is AuthenticatedRequest['user'] {
  return typeof decoded === 'object' &&
    decoded !== null &&
    typeof (decoded as AuthenticatedRequest['user']).id === 'string' &&
    typeof (decoded as AuthenticatedRequest['user']).username === 'string' &&
    typeof (decoded as AuthenticatedRequest['user']).role === 'string' &&
    typeof (decoded as AuthenticatedRequest['user']).is_active === 'boolean';
}

export const authenticate: AuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!validateToken(token)) {
    const error = createApiError('No valid token provided', null, 401);
    logger.warn('Authentication failed: No valid token provided');
    const response: ApiResponse<void> = {
      success: false,
      error: error.message,
    };
    return res.status(401).json(response);
  }

  try {
    const decoded = verifyToken(token);
    if (!validateDecodedToken(decoded)) {
      throw new Error('Invalid token format');
    }

    // Check if user is active
    if (!decoded.is_active) {
      throw new Error('User account is inactive');
    }

    (req as AuthenticatedRequest).user = decoded;
    logger.info('Authentication successful', { userId: decoded.id });
    next();
  } catch (error) {
    const metadata: LogMetadata = {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Authentication error:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Invalid token',
      error,
      401,
    );
    const response: ApiResponse<void> = {
      success: false,
      error: apiError.message,
    };
    return res.status(401).json(response);
  }
};

export function requireRole(roles: string[]): AuthMiddleware {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    try {
      if (!authReq.user) {
        const error = createApiError('Authentication required', null, 401);
        logger.warn('Role check failed: No user in request');
        const response: ApiResponse<void> = {
          success: false,
          error: error.message,
        };
        return res.status(401).json(response);
      }

      if (!roles.includes(authReq.user.role)) {
        const metadata: LogMetadata = {
          requiredRoles: roles,
          userRole: authReq.user.role,
          userId: authReq.user.id,
        };
        const error = createApiError('Insufficient permissions', metadata, 403);
        logger.warn('Role check failed: Insufficient permissions', metadata);
        const response: ApiResponse<void> = {
          success: false,
          error: error.message,
        };
        return res.status(403).json(response);
      }

      logger.info('Role check passed', {
        userId: authReq.user.id,
        role: authReq.user.role,
        requiredRoles: roles,
      });
      next();
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
        roles,
        userRole: authReq.user?.role,
        userId: authReq.user?.id,
      };
      logger.error('Role check error:', metadata);

      const apiError = createApiError(
        error instanceof Error ? error.message : 'Role check failed',
        error,
        500,
      );
      const response: ApiResponse<void> = {
        success: false,
        error: apiError.message,
      };
      return res.status(500).json(response);
    }
  };
}

export function checkRole(role: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      const error = createApiError('Unauthorized', null, 401);
      logger.warn('Role check failed: No user');
      void res.status(401).json({
        success: false,
        error: error.message,
      });
      return;
    }

    if (req.user.role !== role) {
      const error = createApiError('Forbidden', null, 403);
      logger.warn('Role check failed: Invalid role', {
        userId: req.user.id,
        requiredRole: role,
        actualRole: req.user.role,
      });
      void res.status(403).json({
        success: false,
        error: error.message,
      });
      return;
    }

    next();
  };
}
