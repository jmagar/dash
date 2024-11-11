import { Request, Response, NextFunction } from 'express';
import { verify } from 'jsonwebtoken';

import { AuthenticatedUser } from '../../types/jwt';
import { serverLogger as logger } from '../../utils/serverLogger';

export interface AuthenticatedRequest<
  P = any,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any,
> extends Request<P, ResBody, ReqBody, ReqQuery> {
  user: AuthenticatedUser;
}

interface JWTVerificationResult {
  id: string;
  username: string;
  role: string;
  iat: number;
  exp: number;
}

const isValidToken = (decoded: unknown): decoded is JWTVerificationResult => {
  if (!decoded || typeof decoded !== 'object') return false;

  const token = decoded as Record<string, unknown>;
  return (
    typeof token.id === 'string' &&
    typeof token.username === 'string' &&
    typeof token.role === 'string' &&
    typeof token.iat === 'number' &&
    typeof token.exp === 'number'
  );
};

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      res.status(401).json({ success: false, error: 'No token provided' });
      return;
    }

    const decoded = verify(token, process.env.JWT_SECRET || '');

    if (!isValidToken(decoded)) {
      throw new Error('Invalid token format');
    }

    (req as AuthenticatedRequest).user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
    };
    next();
  } catch (err) {
    logger.error('Authentication error:', {
      error: (err as Error).message,
      stack: (err as Error).stack,
    });
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

export const checkRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const authReq = req as AuthenticatedRequest;
      if (!authReq.user) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      if (!roles.includes(authReq.user.role)) {
        res.status(403).json({ success: false, error: 'Insufficient permissions' });
        return;
      }

      next();
    } catch (err) {
      logger.error('Role check error:', {
        error: (err as Error).message,
        stack: (err as Error).stack,
      });
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  };
};
