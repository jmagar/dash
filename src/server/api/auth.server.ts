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
  try {
    const { username, password } = req.body;

    // Check if user is locked out
    if (isUserLocked(username)) {
      const metadata: LogMetadata = { username };
      const error = createApiError('Account temporarily locked. Please try again later.', 429, metadata);
      void res.status(429).json({
        success: false,
        error: error.message,
      });
      return;
    }

    // Check if user exists
    const result = await db.query<UserType>('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    if (!user || !user.password_hash) {
      recordLoginAttempt(username, false);
      const metadata: LogMetadata = { username };
      const error = createApiError('Invalid username or password', 401, metadata);
      void res.status(401).json({
        success: false,
        error: error.message,
      });
      return;
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      recordLoginAttempt(username, false);
      const metadata: LogMetadata = { username };
      const error = createApiError('Invalid username or password', 401, metadata);
      void res.status(401).json({
        success: false,
        error: error.message,
      });
      return;
    }

    if (!user.is_active) {
      const metadata: LogMetadata = { username, userId: user.id };
      const error = createApiError('Account is disabled', 403, metadata);
      void res.status(403).json({
        success: false,
        error: error.message,
      });
      return;
    }

    recordLoginAttempt(username, true);
    const token = generateToken(user);
    const refreshToken = generateToken(user); // Generate refresh token
    await cache.setSession(token, user, refreshToken);

    logger.info('Login successful', { userId: user.id, username: user.username });
    void res.json({
      success: true,
      token,
      user: mapUserToAuthUser(user),
    });
    return;

  } catch (error) {
    const metadata: LogMetadata = {
      username: req.body.username,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Login failed:', metadata);

    void res.status(500).json({
      success: false,
      error: 'An error occurred during login',
    });
    return;
  }
}

export async function validateToken(
  req: Request,
  res: Response<ValidateResponse>
): Promise<void> {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      const metadata: LogMetadata = {};
      const error = createApiError('No token provided', 401, metadata);
      logger.warn('Token validation failed: No token provided');
      void res.status(401).json({
        success: false,
        error: error.message,
      });
      return;
    }

    // Verify token
    const payload = verifyToken(token);
    if (!payload) {
      const metadata: LogMetadata = {};
      const error = createApiError('Invalid token', 401, metadata);
      logger.warn('Token validation failed: Invalid token');
      void res.status(401).json({
        success: false,
        error: error.message,
      });
      return;
    }

    // Get user from cache
    const sessionData = await cache.getSession(token);
    if (!sessionData) {
      const metadata: LogMetadata = { token };
      const error = createApiError('Session expired', 401, metadata);
      logger.warn('Token validation failed: Session expired');
      void res.status(401).json({
        success: false,
        error: error.message,
      });
      return;
    }

    // Parse the session data
    let sessionUser: User;
    try {
      const session = JSON.parse(sessionData);
      sessionUser = session.user;
    } catch (error) {
      const metadata: LogMetadata = { token, error: 'Invalid session data format' };
      const error = createApiError('Invalid session data', 401, metadata);
      logger.error('Session data parse error:', metadata);
      void res.status(401).json({
        success: false,
        error: error.message,
      });
      return;
    }

    logger.info('Token validated successfully', {
      userId: sessionUser.id,
      username: sessionUser.username,
    });

    void res.json({
      success: true,
      user: mapUserToAuthUser(sessionUser),
    });
    return;

  } catch (error) {
    const metadata: LogMetadata = {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Token validation error:', metadata);

    if (error instanceof Error && error.name === 'JsonWebTokenError') {
      void res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
      return;
    }

    if (error instanceof Error && error.name === 'TokenExpiredError') {
      void res.status(401).json({
        success: false,
        error: 'Token expired',
      });
      return;
    }

    void res.status(500).json({
      success: false,
      error: 'An error occurred during token validation',
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
    const sessionData = await cache.getSession(token);
    if (sessionData) {
      await cache.removeSession(token);
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
