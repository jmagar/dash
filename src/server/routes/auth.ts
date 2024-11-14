import express, { type Response } from 'express';

import { createApiError } from '../../types/error';
import { type RequestHandler } from '../../types/express';
import type { LogMetadata } from '../../types/logger';
import type { User, AuthResult } from '../../types/models-shared';
import cache from '../cache';
import { generateToken } from '../utils/jwt';
import { logger } from '../utils/logger';

const router = express.Router();

interface LoginCredentials {
  username: string;
  password: string;
}

function validateLoginRequest(body: unknown): body is LoginCredentials {
  return typeof body === 'object' &&
    body !== null &&
    typeof (body as LoginCredentials).username === 'string' &&
    typeof (body as LoginCredentials).password === 'string' &&
    (body as LoginCredentials).username.trim().length > 0 &&
    (body as LoginCredentials).password.trim().length > 0;
}

/**
 * User login endpoint
 */
const loginHandler: RequestHandler<unknown, AuthResult, LoginCredentials> = async (req, res: Response) => {
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
    return res.json(result);
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
    return res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
};

/**
 * Check if user is authenticated
 */
const checkAuthHandler: RequestHandler<unknown, AuthResult> = async (req, res: Response) => {
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

    if (!user || !user.id || !user.username || !user.role || typeof user.is_active === 'undefined') {
      throw createApiError('Invalid user data in session', 401);
    }

    logger.info('Session validated successfully', { userId: user.id });

    const result: AuthResult = {
      success: true,
      data: user,
    };
    return res.json(result);
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
    return res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
};

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

// Register routes
router.post('/login', loginHandler);
router.get('/check', checkAuthHandler);

export default router;
