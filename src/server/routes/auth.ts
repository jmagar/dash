import express from 'express';
import type { Request, Response } from 'express-serve-static-core';

import { createApiError } from '../../types/error';
import type { LogMetadata } from '../../types/logger';
import type { User, AuthResult } from '../../types/models-shared';
import cache from '../cache';
import { logger } from '../utils/logger';

const router = express.Router();

interface LoginRequest extends Request {
  body: {
    username: string;
    password: string;
  };
}

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    [key: string]: unknown;
  };
}

function validateLoginRequest(body: unknown): body is { username: string; password: string } {
  return typeof body === 'object' &&
    body !== null &&
    typeof (body as { username: string }).username === 'string' &&
    typeof (body as { password: string }).password === 'string' &&
    (body as { username: string }).username.trim().length > 0 &&
    (body as { password: string }).password.trim().length > 0;
}

/**
 * User login endpoint
 */
router.post('/login', async (req: LoginRequest, res: Response) => {
  try {
    if (!validateLoginRequest(req.body)) {
      throw createApiError('Invalid request format', 400);
    }

    const { username, password } = req.body;

    // Validate credentials
    const user = await validateCredentials(username, password);
    if (!user) {
      throw createApiError('Invalid credentials', 401);
    }

    // Generate session token
    const token = generateToken(user);

    // Cache session
    await cache.cacheSession(token, JSON.stringify(user));

    logger.info('User logged in successfully', { username });

    const result: AuthResult = {
      success: true,
      token,
      data: user,
    };
    res.json(result);
  } catch (error) {
    const metadata: LogMetadata = {
      username: req.body?.username,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Login failed:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Login failed',
      error instanceof Error && error.message.includes('Invalid request') ? 400 : 500,
      metadata,
    );
    res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
});

/**
 * Check if user is authenticated
 */
router.get('/check', async (req: AuthenticatedRequest, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    const error = createApiError('No token provided', 401);
    return res.status(error.status || 401).json({
      success: false,
      error: error.message,
    });
  }

  try {
    const session = await cache.getSession(token);
    if (!session) {
      throw createApiError('Invalid or expired session', 401);
    }

    let user: User;
    try {
      user = JSON.parse(session);
    } catch {
      throw createApiError('Invalid session data', 401);
    }

    if (!user || typeof user.id === 'undefined' || !user.username || !user.role) {
      throw createApiError('Invalid user data in session', 401);
    }

    logger.info('Session validated successfully', { userId: String(user.id) });

    const result: AuthResult = {
      success: true,
      data: user,
    };
    res.json(result);
  } catch (error) {
    const metadata: LogMetadata = {
      token,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Session check failed:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Session check failed',
      error instanceof Error &&
        (error.message.includes('Invalid') || error.message.includes('expired'))
        ? 401 : 500,
      metadata,
    );
    res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
});

/**
 * Validate user credentials
 */
async function validateCredentials(username: string, password: string): Promise<User | null> {
  // TODO: Implement proper credential validation
  // This is just a placeholder implementation
  if (username === 'admin' && password === 'admin') {
    const user: User = {
      id: '1',
      username: 'admin',
      role: 'admin',
      is_active: true,
      email: 'admin@example.com',
      lastLogin: new Date(),
    };
    return user;
  }
  return null;
}

/**
 * Generate session token
 */
function generateToken(user: User): string {
  // TODO: Implement proper token generation
  // This is just a placeholder implementation
  return Buffer.from(`${user.id}:${user.username}:${Date.now()}`).toString('base64');
}

export default router;
