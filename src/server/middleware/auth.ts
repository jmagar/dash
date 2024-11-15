import { Request, Response, NextFunction } from 'express';
import { verify } from 'jsonwebtoken';

import type { TokenPayload } from '../../types/auth';
import { config } from '../config';
import { logger } from '../utils/logger';

interface RequestParams {
  userId?: string;
}

interface RequestBody {
  userId?: string;
}

interface JwtPayload extends TokenPayload {
  iat?: number;
  exp?: number;
  is_active: boolean;
}

function isJwtPayload(payload: unknown): payload is JwtPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'id' in payload &&
    'username' in payload &&
    'role' in payload &&
    'is_active' in payload &&
    typeof (payload as JwtPayload).id === 'string' &&
    typeof (payload as JwtPayload).username === 'string' &&
    typeof (payload as JwtPayload).is_active === 'boolean' &&
    ((payload as JwtPayload).role === 'admin' || (payload as JwtPayload).role === 'user')
  );
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const decoded = verify(token, config.jwt.secret);

    if (isJwtPayload(decoded)) {
      const tokenPayload: TokenPayload & { is_active: boolean } = {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role,
        is_active: decoded.is_active,
      };
      req.user = tokenPayload;
      next();
    } else {
      res.status(401).json({
        success: false,
        error: 'Invalid token format',
      });
    }
  } catch (error) {
    logger.error('Authentication failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(401).json({
      success: false,
      error: 'Invalid token',
    });
  }
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
    return;
  }
  next();
}

export function requireSameUser(
  req: Request<RequestParams, unknown, RequestBody>,
  res: Response,
  next: NextFunction
): void {
  const requestUserId = req.params.userId || req.body.userId;
  const currentUserId = req.user?.id;
  const userRole = req.user?.role;

  if (!requestUserId || (!currentUserId && userRole !== 'admin')) {
    res.status(403).json({
      success: false,
      error: 'Access denied',
    });
    return;
  }

  if (userRole === 'admin' || requestUserId === currentUserId) {
    next();
  } else {
    res.status(403).json({
      success: false,
      error: 'Access denied',
    });
  }
}
