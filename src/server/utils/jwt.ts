import { sign, verify } from 'jsonwebtoken';

import type { TokenPayload, AccessTokenPayload, RefreshTokenPayload } from '../../types/auth';
import type { User } from '../../types/models-shared';
import { config } from '../config';
import { logger } from './logger';

export function generateToken(user: User): string {
  const payload: AccessTokenPayload = {
    id: user.id,
    username: user.username,
    role: user.role,
    type: 'access',
  };

  return sign(payload, config.security.jwt.secret, {
    expiresIn: config.security.jwt.expiresIn,
  });
}

export function generateRefreshToken(user: User): string {
  const payload: RefreshTokenPayload = {
    id: user.id,
    username: user.username,
    role: user.role,
    type: 'refresh',
  };

  return sign(payload, config.security.jwt.secret, {
    expiresIn: config.security.jwt.refreshExpiresIn,
  });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = verify(token, config.security.jwt.secret) as unknown;

    // Type guard to verify the decoded token has the required properties
    if (
      typeof decoded === 'object' &&
      decoded !== null &&
      'id' in decoded &&
      'username' in decoded &&
      'role' in decoded &&
      'type' in decoded &&
      (decoded.type === 'access' || decoded.type === 'refresh')
    ) {
      return decoded as TokenPayload;
    }

    logger.error('Invalid token payload structure');
    return null;
  } catch (error) {
    logger.error('Token verification failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}
