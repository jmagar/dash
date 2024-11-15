import express from 'express';
import type { Response } from 'express';
import { ApiError, createApiError } from '../../types/error';
import type { RequestHandler } from '../../types/express';
import type { LogMetadata } from '../../types/logger';
import type { LoginRequest, LoginResponse, ValidateResponse, LogoutResponse } from '../../types/auth';
import { cacheService } from '../cache/CacheService';
import { generateToken, generateRefreshToken } from '../utils/jwt';
import { logger } from '../utils/logger';

const router = express.Router();

const loginHandler: RequestHandler<unknown, LoginResponse, LoginRequest> = async (req, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      const metadata: LogMetadata = { body: req.body };
      throw new ApiError('Invalid request format', undefined, 400, metadata);
    }

    // Validate credentials
    const user = await validateCredentials(username, password);
    if (!user) {
      const metadata: LogMetadata = { username };
      throw new ApiError('Invalid credentials', undefined, 401, metadata);
    }

    // Generate session token and refresh token
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Cache session
    await cacheService.setSession(token, user, refreshToken);

    logger.info('User logged in successfully', { username });

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error('Login failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    if (error instanceof ApiError) {
      return res.status(error.status).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
    });
  }
};

const validateHandler: RequestHandler<unknown, ValidateResponse> = async (req, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    const metadata: LogMetadata = {};
    const error = new ApiError('No token provided', undefined, 401, metadata);
    return res.status(error.status).json({
      success: false,
      error: error.message,
    });
  }

  try {
    const session = await cacheService.getSession(token);
    if (!session) {
      const metadata: LogMetadata = { token };
      throw new ApiError('Invalid or expired session', undefined, 401, metadata);
    }

    const user = JSON.parse(session);
    return res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error('Token validation failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    if (error instanceof ApiError) {
      return res.status(error.status).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
    });
  }
};

const logoutHandler: RequestHandler<unknown, LogoutResponse> = async (req, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    const metadata: LogMetadata = {};
    const error = new ApiError('No token provided', undefined, 401, metadata);
    return res.status(error.status).json({
      success: false,
      error: error.message,
    });
  }

  try {
    await cacheService.removeSession(token);
    return res.json({ success: true });
  } catch (error) {
    logger.error('Logout failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    // Don't expose errors during logout
    return res.json({ success: true });
  }
};

// Mock function for development
async function validateCredentials(username: string, password: string) {
  if (process.env.NODE_ENV === 'development') {
    return {
      id: '1',
      username: 'admin',
      role: 'admin',
      is_active: true,
      email: 'admin@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  return null;
}

router.post('/login', loginHandler);
router.get('/validate', validateHandler);
router.post('/logout', logoutHandler);

export default router;
