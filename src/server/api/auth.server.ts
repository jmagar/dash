import type { Request, Response } from 'express';

import type { User, AuthenticatedUser, LoginResponse, ValidateResponse, LogoutResponse } from '../../types/auth';
import { createApiError } from '../../types/error';
import type { LogMetadata } from '../../types/logger';
import type { User as UserType } from '../../types/models-shared';
import cache from '../cache';
import { config } from '../config';
import { db } from '../db';
import { generateToken, verifyToken } from '../utils/jwt';
import { logger } from '../utils/logger';
import { comparePassword } from '../utils/password';

// Track failed login attempts
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

function mapUserToAuthUser(user: UserType): AuthenticatedUser {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    email: user.email,
    createdAt: user.createdAt,
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
  res: Response<LoginResponse | { error: string }>
): Promise<void> {
  const { username, password } = req.body;

  try {
    logger.info('Attempting login', { username });

    // Check if user is locked out
    if (isUserLocked(username)) {
      const metadata: LogMetadata = { username };
      const error = createApiError('Account temporarily locked. Please try again later.', metadata, 429);
      void res.status(429).json({ error: error.message });
      return;
    }

    const result = await db.query<UserType>(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    const user = result.rows[0];

    if (!user) {
      recordLoginAttempt(username, false);
      const metadata: LogMetadata = { username };
      const error = createApiError('Invalid username or password', metadata, 401);
      void res.status(401).json({ error: error.message });
      return;
    }

    if (!(await comparePassword(password, user.password_hash || ''))) {
      recordLoginAttempt(username, false);
      const metadata: LogMetadata = { username };
      const error = createApiError('Invalid username or password', metadata, 401);
      void res.status(401).json({ error: error.message });
      return;
    }

    if (!user.is_active) {
      const metadata: LogMetadata = { username, userId: user.id };
      const error = createApiError('Account is disabled', metadata, 403);
      void res.status(403).json({ error: error.message });
      return;
    }

    recordLoginAttempt(username, true);
    const token = generateToken(user);
    const refreshToken = generateToken(user);
    await cache.setSession(token, user, refreshToken);

    logger.info('Login successful', { userId: user.id, username: user.username });
    void res.json({
      token,
      user: mapUserToAuthUser(user),
    });
    return;

  } catch (error) {
    const metadata: LogMetadata = {
      username,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Login error:', metadata);

    const apiError = createApiError('An error occurred during login', metadata, 500);
    void res.status(500).json({ error: apiError.message });
    return;
  }
}

export async function validateToken(
  req: Request,
  res: Response<ValidateResponse | { error: string }>
): Promise<void> {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    const metadata: LogMetadata = {};
    const error = createApiError('No token provided', metadata, 401);
    logger.warn('Token validation failed: No token provided');
    void res.status(401).json({ error: error.message });
    return;
  }

  try {
    // First verify JWT signature and expiration
    const payload = verifyToken(token);
    if (!payload) {
      const metadata: LogMetadata = {};
      const error = createApiError('Invalid token', metadata, 401);
      logger.warn('Token validation failed: Invalid token');
      void res.status(401).json({ error: error.message });
      return;
    }

    // Then check if session exists in cache
    const sessionData = await cache.getSession(token);
    if (!sessionData) {
      const metadata: LogMetadata = { token };
      const error = createApiError('Session expired', metadata, 401);
      logger.warn('Token validation failed: Session expired');
      void res.status(401).json({ error: error.message });
      return;
    }

    // Parse the session data
    let session: { user: UserType; refreshToken: string };
    try {
      session = JSON.parse(sessionData);
    } catch (parseError) {
      const metadata: LogMetadata = { token, error: 'Invalid session data format' };
      const error = createApiError('Invalid session data', metadata, 401);
      logger.error('Session data parse error:', metadata);
      void res.status(401).json({ error: error.message });
      return;
    }

    logger.info('Token validated successfully', {
      userId: session.user.id,
      username: session.user.username,
    });

    void res.json({
      valid: true,
      user: mapUserToAuthUser(session.user),
    });
    return;

  } catch (error) {
    const metadata: LogMetadata = {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Token validation error:', metadata);

    if (error instanceof Error && error.name === 'JsonWebTokenError') {
      void res.status(401).json({ error: 'Invalid token' });
      return;
    }

    if (error instanceof Error && error.name === 'TokenExpiredError') {
      void res.status(401).json({ error: 'Token expired' });
      return;
    }

    const apiError = createApiError('Token validation failed', metadata, 500);
    void res.status(500).json({ error: apiError.message });
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
    const sessionData = await cache.getSession(token);
    if (sessionData) {
      await cache.removeSession(token);
    }

    logger.info('Logout successful');
    void res.json({ success: true });
    return;

  } catch (error) {
    logger.error('Logout error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Don't expose errors to client during logout
    void res.json({ success: true });
    return;
  }
}
