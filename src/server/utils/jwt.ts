import { sign, verify } from 'jsonwebtoken';

import type { TokenPayload, AccessTokenPayload, RefreshTokenPayload, User } from '../../types/auth';
import { config } from '../config';
import { logger } from './logger';

export function generateToken(user: User): string {
  const payload: AccessTokenPayload = {
    id: user.id,
    username: user.username,
    role: user.role,
    is_active: user.is_active,
    type: 'access',
  };

  return sign(payload as unknown as Record<string, unknown>, config.jwt.secret, {
    expiresIn: config.jwt.expiry,
  });
}

export function generateRefreshToken(user: User): string {
  const payload: RefreshTokenPayload = {
    id: user.id,
    username: user.username,
    role: user.role,
    is_active: user.is_active,
    type: 'refresh',
  };

  return sign(payload as unknown as Record<string, unknown>, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiry,
  });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = verify(token, config.jwt.secret) as unknown;

    // Type guard to verify the decoded token has the required properties
    if (
      typeof decoded === 'object' &&
      decoded !== null &&
      'id' in decoded &&
      'username' in decoded &&
      'role' in decoded &&
      'is_active' in decoded &&
      'type' in decoded &&
      (decoded.type === 'access' || decoded.type === 'refresh') &&
      typeof decoded.id === 'string' &&
      typeof decoded.username === 'string' &&
      (decoded.role === 'admin' || decoded.role === 'user') &&
      typeof decoded.is_active === 'boolean'
    ) {
      return decoded as TokenPayload;
    }

    logger.warn('Invalid token structure', {
      decoded,
    });
    return null;
  } catch (error) {
    logger.warn('Token verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}
