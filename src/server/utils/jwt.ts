import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken';

import { logger } from './logger';
import { createApiError } from '../../types/error';
import type { User } from '../../types/models-shared';

// Environment validation
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '1h';
const JWT_ALGORITHM = 'HS256';

type JwtAlgorithm =
  | 'HS256' | 'HS384' | 'HS512'
  | 'RS256' | 'RS384' | 'RS512'
  | 'ES256' | 'ES384' | 'ES512'
  | 'PS256' | 'PS384' | 'PS512'
  | 'none';

if (!validateExpiration(JWT_EXPIRATION)) {
  logger.error('Invalid JWT_EXPIRATION format', { expiration: JWT_EXPIRATION });
  throw new Error('Invalid JWT_EXPIRATION format. Expected format: number + s|m|h|d|y');
}

interface JwtUser {
  id: string;
  username: string;
  role: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

function validateExpiration(exp: string): boolean {
  return /^\d+[smhdy]$/.test(exp);
}

export function generateToken(user: User): string {
  const payload: Record<string, unknown> = {
    id: user.id,
    username: user.username,
    role: user.role,
  };

  try {
    const options: SignOptions = {
      expiresIn: JWT_EXPIRATION,
    };

    const token = jwt.sign(payload, JWT_SECRET, options);

    logger.info('Token generated successfully', {
      userId: user.id,
      expiration: JWT_EXPIRATION,
    });

    return token;
  } catch (error) {
    logger.error('Failed to generate token:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: user.id,
    });
    throw createApiError(
      'Failed to generate authentication token',
      500,
    );
  }
}

export function verifyToken(token: string): JwtUser {
  try {
    const options: VerifyOptions = {
      algorithms: [JWT_ALGORITHM as JwtAlgorithm],
    };

    const decoded = jwt.verify(token, JWT_SECRET, options);

    if (!isValidToken(decoded)) {
      logger.warn('Invalid token format detected');
      throw createApiError('Invalid token format', 401);
    }

    // Check if token is expired
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      logger.warn('Expired token detected', {
        expiredAt: new Date(decoded.exp * 1000).toISOString(),
      });
      throw createApiError('Token has expired', 401);
    }

    logger.info('Token verified successfully', { userId: decoded.id });
    return decoded;
  } catch (error) {
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      logger.warn('JWT expired:', { error: error.message });
      throw createApiError('Token has expired', 401);
    }

    if (error instanceof Error && error.name === 'JsonWebTokenError') {
      logger.warn('JWT verification failed:', { error: error.message });
      throw createApiError('Invalid token', 401);
    }

    logger.error('Token verification error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError(
      error instanceof Error ? error.message : 'Invalid token',
      401,
    );
  }
}

export function isValidToken(payload: unknown): payload is JwtUser {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const requiredFields = ['id', 'username', 'role'] as const;
  const hasRequiredFields = requiredFields.every(field =>
    field in payload &&
    typeof (payload as JwtUser)[field] === 'string'
  );

  if (!hasRequiredFields) {
    return false;
  }

  // Optional fields validation
  const optionalFields = ['exp', 'iat'] as const;
  const hasValidOptionalFields = optionalFields.every(field =>
    !(field in payload) || typeof (payload as JwtUser)[field] === 'number'
  );

  return hasValidOptionalFields;
}

export function decodeToken(token: string): JwtUser | null {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || typeof decoded !== 'object') {
      logger.warn('Invalid token format in decode');
      return null;
    }

    if (!isValidToken(decoded)) {
      logger.warn('Invalid token payload in decode');
      return null;
    }

    return decoded;
  } catch (error) {
    logger.error('Token decode error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}
