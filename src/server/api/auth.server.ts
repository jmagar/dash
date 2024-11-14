import type { Request, Response } from 'express';

import type { User, AuthenticatedUser, LoginResponse, ValidateResponse, LogoutResponse } from '../../types/auth';
import { createApiError } from '../../types/error';
import type { LogMetadata } from '../../types/logger';
import cache from '../cache';
import { db } from '../db';
import { logger } from '../utils/logger';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config';

// Track failed login attempts
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

function mapUserToAuthUser(user: User): AuthenticatedUser {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
  };
}

function isUserLocked(username: string): boolean {
  const attempts = loginAttempts.get(username);
  if (!attempts) return false;

  const now = Date.now();
  if (now - attempts.lastAttempt > config.security.loginLockoutTime) {
    loginAttempts.delete(username);
    return false;
  }

  return attempts.count >= config.security.maxLoginAttempts;
}

function recordLoginAttempt(username: string, success: boolean): void {
  if (success) {
    loginAttempts.delete(username);
    return;
  }

  const attempts = loginAttempts.get(username) || { count: 0, lastAttempt: 0 };
  attempts.count += 1;
  attempts.lastAttempt = Date.now();
  loginAttempts.set(username, attempts);
}

export async function login(
  req: Request<unknown, LoginResponse, { username: string; password: string }>,
  res: Response<LoginResponse>
): Promise<void> {
  const { username, password } = req.body;

  try {
    logger.info('Attempting login', { username });

    // Check if user is locked out
    if (isUserLocked(username)) {
      const error = createApiError('Account temporarily locked. Please try again later.', 429);
      void res.status(429).json({
        success: false,
        error: error.message,
      });
      return;
    }

    if (config.security.disableAuth && process.env.NODE_ENV !== 'production') {
      logger.warn('Auth disabled (development only), auto-login successful', { username });
      const mockUser: User = {
        id: '1',
        username,
        role: 'admin',
        is_active: true,
        email: `${username}@example.com`,
      };
      const { token, refreshToken } = await generateTokens(mockUser);
      await cache.cacheSession(token, JSON.stringify({ user: mockUser, refreshToken }));
      
      void res.json({
        success: true,
        token,
        refreshToken,
        user: mapUserToAuthUser(mockUser),
      });
      return;
    }

    const result = await db.query<User>('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user || !(await validatePassword(password, user.password_hash))) {
      recordLoginAttempt(username, false);
      const error = createApiError('Invalid username or password', 401);
      void res.status(401).json({
        success: false,
        error: error.message,
      });
      return;
    }

    if (!user.is_active) {
      const error = createApiError('Account is disabled', 403);
      void res.status(403).json({
        success: false,
        error: error.message,
      });
      return;
    }

    recordLoginAttempt(username, true);
    const { token, refreshToken } = await generateTokens(user);
    await cache.cacheSession(token, JSON.stringify({ user, refreshToken }));

    logger.info('Login successful', { userId: user.id, username: user.username });
    void res.json({
      success: true,
      token,
      refreshToken,
      user: mapUserToAuthUser(user),
    });
    return;

  } catch (error) {
    const metadata: LogMetadata = {
      username,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Login error:', metadata);

    const apiError = createApiError(
      'An error occurred during login',
      500,
      metadata,
    );
    void res.status(500).json({
      success: false,
      error: apiError.message,
    });
    return;
  }
}

export async function validateToken(
  req: Request,
  res: Response<ValidateResponse>
): Promise<void> {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    const error = createApiError('No token provided', 401);
    logger.warn('Token validation failed: No token provided');
    void res.status(401).json({
      success: false,
      error: error.message,
    });
    return;
  }

  try {
    // First verify JWT signature and expiration
    const decoded = jwt.verify(token, config.jwt.secret, {
      algorithms: [config.jwt.algorithm],
    }) as jwt.JwtPayload;

    // Then check if session exists in cache
    const session = await cache.getSession(token);
    if (!session) {
      const error = createApiError('Invalid or expired token', 401);
      logger.warn('Token validation failed: Session not found', { userId: decoded.id });
      void res.status(401).json({
        success: false,
        error: error.message,
      });
      return;
    }

    const { user, refreshToken } = JSON.parse(session);
    logger.info('Token validated successfully', {
      userId: user.id,
      username: user.username,
    });

    void res.json({
      success: true,
      user: mapUserToAuthUser(user),
    });
    return;

  } catch (error) {
    const metadata: LogMetadata = {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Token validation error:', metadata);

    if (error instanceof jwt.JsonWebTokenError) {
      void res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      void res.status(401).json({
        success: false,
        error: 'Token expired',
      });
      return;
    }

    const apiError = createApiError(
      'Token validation failed',
      500,
      metadata,
    );
    void res.status(500).json({
      success: false,
      error: apiError.message,
    });
    return;
  }
}

export async function logout(
  req: Request,
  res: Response<LogoutResponse>
): Promise<void> {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    void res.json({ success: true });
    return;
  }

  try {
    // Invalidate both the access token and refresh token
    const session = await cache.getSession(token);
    if (session) {
      const { refreshToken } = JSON.parse(session);
      await Promise.all([
        cache.deleteSession(token),
        cache.deleteSession(refreshToken),
      ]);
    }

    logger.info('Logout successful');
    void res.json({ success: true });
    return;

  } catch (error) {
    const metadata: LogMetadata = {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Logout error:', metadata);

    // Don't expose errors to client during logout
    void res.json({ success: true });
    return;
  }
}

async function validatePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

async function generateTokens(user: User): Promise<{ token: string; refreshToken: string }> {
  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      type: 'access'
    },
    config.jwt.secret,
    { 
      expiresIn: config.jwt.expiresIn,
      algorithm: config.jwt.algorithm
    }
  );

  const refreshToken = jwt.sign(
    {
      id: user.id,
      type: 'refresh'
    },
    config.jwt.secret,
    { 
      expiresIn: config.jwt.refreshExpiresIn,
      algorithm: config.jwt.algorithm
    }
  );

  return { token, refreshToken };
}
