import type { Request, Response, NextFunction } from 'express';

import { createApiError } from '../../types/error';
import type { LogMetadata } from '../../types/logger';
import { verifyToken } from '../utils/jwt';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
  };
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    const error = createApiError('No token provided', 401);
    logger.warn('Authentication failed: No token provided');
    res.status(401).json({
      success: false,
      error: error.message,
      status: error.status,
    });
    return;
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    const metadata: LogMetadata = {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Authentication error:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Invalid token',
      401,
      metadata,
    );
    res.status(401).json({
      success: false,
      error: apiError.message,
      status: apiError.status,
    });
  }
}

export function requireRole(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        const error = createApiError('Authentication required', 401);
        logger.warn('Role check failed: No user in request');
        res.status(401).json({
          success: false,
          error: error.message,
          status: error.status,
        });
        return;
      }

      if (!roles.includes(req.user.role)) {
        const metadata: LogMetadata = {
          requiredRoles: roles,
          userRole: req.user.role,
        };
        const error = createApiError('Insufficient permissions', 403, metadata);
        logger.warn('Role check failed: Insufficient permissions', metadata);
        res.status(403).json({
          success: false,
          error: error.message,
          status: error.status,
        });
        return;
      }

      next();
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
        roles,
        userRole: req.user?.role,
      };
      logger.error('Role check error:', metadata);

      const apiError = createApiError(
        error instanceof Error ? error.message : 'Role check failed',
        500,
        metadata,
      );
      res.status(500).json({
        success: false,
        error: apiError.message,
        status: apiError.status,
      });
    }
  };
}
