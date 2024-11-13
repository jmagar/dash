import type { Request, Response, NextFunction } from 'express';

import { createApiError } from '../../types/error';
import type { LogMetadata } from '../../types/logger';
import type { User, ApiResponse } from '../../types/models-shared';
import { verifyToken } from '../utils/jwt';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

function validateToken(token: unknown): token is string {
  return typeof token === 'string' && token.trim().length > 0;
}

function validateDecodedToken(decoded: unknown): decoded is User {
  return typeof decoded === 'object' &&
    decoded !== null &&
    typeof (decoded as User).id !== 'undefined' &&
    typeof (decoded as User).username === 'string' &&
    typeof (decoded as User).role === 'string' &&
    typeof (decoded as User).is_active === 'boolean';
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!validateToken(token)) {
    const error = createApiError('No valid token provided', 401);
    logger.warn('Authentication failed: No valid token provided');
    const response: ApiResponse<void> = {
      success: false,
      error: error.message,
    };
    res.status(401).json(response);
    return;
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

    req.user = decoded;
    logger.info('Authentication successful', { userId: String(decoded.id) });
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
    const response: ApiResponse<void> = {
      success: false,
      error: apiError.message,
    };
    res.status(401).json(response);
  }
}

export function requireRole(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        const error = createApiError('Authentication required', 401);
        logger.warn('Role check failed: No user in request');
        const response: ApiResponse<void> = {
          success: false,
          error: error.message,
        };
        res.status(401).json(response);
        return;
      }

      if (!roles.includes(req.user.role)) {
        const metadata: LogMetadata = {
          requiredRoles: roles,
          userRole: req.user.role,
          userId: String(req.user.id),
        };
        const error = createApiError('Insufficient permissions', 403, metadata);
        logger.warn('Role check failed: Insufficient permissions', metadata);
        const response: ApiResponse<void> = {
          success: false,
          error: error.message,
        };
        res.status(403).json(response);
        return;
      }

      logger.info('Role check passed', {
        userId: String(req.user.id),
        role: req.user.role,
        requiredRoles: roles,
      });
      next();
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
        roles,
        userRole: req.user?.role,
        userId: req.user ? String(req.user.id) : undefined,
      };
      logger.error('Role check error:', metadata);

      const apiError = createApiError(
        error instanceof Error ? error.message : 'Role check failed',
        500,
        metadata,
      );
      const response: ApiResponse<void> = {
        success: false,
        error: apiError.message,
      };
      res.status(500).json(response);
    }
  };
}
