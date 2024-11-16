import type { Request, Response, NextFunction } from '../../types/express';
import type { TokenPayload } from '../../types/auth';
import { verifyToken } from '../utils/jwt';
import { ApiError } from '../../types/error';
import { logger } from '../utils/logger';

interface RequestWithAuth extends Request {
  user: TokenPayload;
}

interface RequestWithBody {
  [key: string]: unknown;
}

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
    if (!payload) {
      throw new ApiError('Invalid token', undefined, 401);
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
      error: 'Invalid or expired token',
    });
  }
}

/**
 * Check user role middleware
 */
export function checkRole(requiredRole: string) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new ApiError('Authentication required', undefined, 401);
      }

      if (req.user.role !== requiredRole) {
        throw new ApiError('Insufficient permissions', undefined, 403);
      }

      next();
    } catch (error) {
      logger.warn('Role check failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        path: req.path,
        method: req.method,
        ip: req.ip,
        requiredRole,
        userRole: req.user?.role,
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
        error: 'Internal server error',
      });
    }
  };
}

/**
 * Check if user is accessing their own resources
 */
export function checkOwnership(userIdParam: string = 'userId') {
  return async (
    req: RequestWithAuth,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const params = req.params as RequestWithBody;
    const body = req.body as RequestWithBody;
    const resourceUserId = params[userIdParam] || body[userIdParam];

    if (!resourceUserId || resourceUserId !== req.user.id) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }

    next();
  };
}

// Export middleware
export const requireAuth = authenticateToken;
export const requireRole = checkRole;
export const requireOwnership = checkOwnership;
