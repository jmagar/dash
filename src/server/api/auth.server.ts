import type { Request, Response } from 'express-serve-static-core';

import type { User } from '../../types/auth';
import { createApiError } from '../../types/error';
import type { LogMetadata } from '../../types/logger';
import cache from '../cache';
import { db } from '../db';
import { logger } from '../utils/logger';

export async function login(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body;

  try {
    logger.info('Attempting login', { username });
    const result = await db.query<User>('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user || !user.password_hash) {
      const error = createApiError('Invalid credentials', 401);
      logger.warn('Login failed: Invalid username', { username });
      res.status(401).json({
        success: false,
        error: error.message,
      });
      return;
    }

    const validPassword = await validatePassword(password, user.password_hash);
    if (!validPassword) {
      const error = createApiError('Invalid credentials', 401);
      logger.warn('Login failed: Invalid password', { username });
      res.status(401).json({
        success: false,
        error: error.message,
      });
      return;
    }

    // Generate session token
    const token = generateToken(user);
    await cache.cacheSession(token, JSON.stringify(user));

    logger.info('Login successful', {
      username,
      userId: user.id,
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    const metadata: LogMetadata = {
      username,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Login error:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Login failed',
      500,
      metadata,
    );
    res.status(500).json({
      success: false,
      error: apiError.message,
    });
  }
}

export async function validateToken(req: Request, res: Response): Promise<void> {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    const error = createApiError('No token provided', 401);
    logger.warn('Token validation failed: No token provided');
    res.status(401).json({
      success: false,
      error: error.message,
    });
    return;
  }

  try {
    const session = await cache.getSession(token);
    if (!session) {
      const error = createApiError('Invalid or expired token', 401);
      logger.warn('Token validation failed: Invalid token');
      res.status(401).json({
        success: false,
        error: error.message,
      });
      return;
    }

    const user = JSON.parse(session);
    logger.info('Token validated successfully', {
      userId: user.id,
      username: user.username,
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    const metadata: LogMetadata = {
      token,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Token validation error:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Token validation failed',
      500,
      metadata,
    );
    res.status(500).json({
      success: false,
      error: apiError.message,
    });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    const error = createApiError('No token provided', 401);
    logger.warn('Logout failed: No token provided');
    res.status(401).json({
      success: false,
      error: error.message,
    });
    return;
  }

  try {
    const session = await cache.getSession(token);
    if (session) {
      const user = JSON.parse(session);
      logger.info('User logged out', {
        userId: user.id,
        username: user.username,
      });
    }

    // Invalidate session
    await cache.invalidateSession(token);

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    const metadata: LogMetadata = {
      token,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Logout error:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Logout failed',
      500,
      metadata,
    );
    res.status(500).json({
      success: false,
      error: apiError.message,
    });
  }
}

// Helper functions (implement these according to your auth strategy)
async function validatePassword(password: string, hash: string): Promise<boolean> {
  // TODO: Implement password validation
  return password === 'admin' && hash === 'admin';
}

function generateToken(user: User): string {
  // TODO: Implement proper token generation
  return Buffer.from(`${user.id}:${user.username}:${Date.now()}`).toString('base64');
}
