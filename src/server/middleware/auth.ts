import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt';
import { logger } from '../utils/logger';
import { ApiError } from '../../types/error';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

type AuthenticatedRequest = Request & { user: TokenPayload };

/**
 * Authenticate JWT token middleware
 */
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new ApiError('No token provided', undefined, 401);
    }

    const token = authHeader.split(' ')[1];
    const payload = await verifyToken(token);

    if (payload.type !== 'access') {
      throw new ApiError('Invalid token type', undefined, 401);
    }

    req.user = payload;
    next();
  } catch (error) {
    logger.warn('Authentication failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: req.path,
      method: req.method,
      ip: req.ip,
    });

    if (error instanceof ApiError) {
      res.status(error.status).json({
        success: false,
        error: error.message,
      });
      return;
    }

    res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}

/**
 * Check user role middleware
 */
export function checkRole(requiredRole: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as AuthenticatedRequest).user;
      
      if (!user) {
        throw new ApiError('User not authenticated', undefined, 401);
      }

      if (user.role !== requiredRole) {
        throw new ApiError('Insufficient permissions', undefined, 403);
      }

      next();
    } catch (error) {
      logger.warn('Role check failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        requiredRole,
        userRole: (req as AuthenticatedRequest).user?.role,
        path: req.path,
      });

      if (error instanceof ApiError) {
        res.status(error.status).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Role check failed',
      });
    }
  };
}

/**
 * Check if user is accessing their own resources
 */
export function checkOwnership(userIdParam: string = 'userId') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as AuthenticatedRequest).user;
      
      if (!user) {
        throw new ApiError('User not authenticated', undefined, 401);
      }

      const resourceUserId = req.params[userIdParam];
      if (!resourceUserId) {
        throw new ApiError('User ID parameter not found', undefined, 400);
      }

      if (user.id !== resourceUserId) {
        throw new ApiError('Access denied', undefined, 403);
      }

      next();
    } catch (error) {
      logger.warn('Ownership check failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: (req as AuthenticatedRequest).user?.id,
        resourceId: req.params[userIdParam],
        path: req.path,
      });

      if (error instanceof ApiError) {
        res.status(error.status).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Ownership check failed',
      });
    }
  };
}

// Export middleware
export const requireAuth = authenticateToken;
export const requireRole = checkRole;
export const requireOwnership = checkOwnership;
