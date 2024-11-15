import express from 'express';
import type { Response } from 'express';
import { ApiError } from '../../types/error';
import type { RequestHandler } from '../../types/express';
import type { LogMetadata } from '../../types/logger';
import type {
  LoginRequest,
  LoginResponse,
  ValidateResponse,
  LogoutResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  User,
  AuthenticatedUser,
} from '../../types/auth';
import { cacheService } from '../cache/CacheService';
import { generateToken, generateRefreshToken, verifyToken } from '../utils/jwt';
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

    const authenticatedUser: AuthenticatedUser = {
      ...user,
      token,
      refreshToken,
    };

    return res.json({
      success: true,
      token,
      refreshToken,
      user: authenticatedUser,
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

    const { user, refreshToken } = JSON.parse(session);

    const authenticatedUser: AuthenticatedUser = {
      ...user,
      token,
      refreshToken,
    };

    return res.json({
      success: true,
      valid: true,
      user: authenticatedUser,
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
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      await cacheService.removeSession(token);
    }
    return res.json({ success: true });
  } catch (error) {
    logger.error('Logout failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    // Don't expose errors during logout
    return res.json({ success: true });
  }
};

const refreshHandler: RequestHandler<unknown, RefreshTokenResponse, RefreshTokenRequest> = async (req, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new ApiError('No refresh token provided', undefined, 400);
    }

    const decoded = verifyToken(refreshToken);
    if (!decoded || decoded.type !== 'refresh') {
      throw new ApiError('Invalid refresh token', undefined, 401);
    }

    const session = await cacheService.getSession(refreshToken);
    if (!session) {
      throw new ApiError('Invalid or expired session', undefined, 401);
    }

    const { user } = JSON.parse(session);

    // Generate new tokens
    const newToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Update session
    await cacheService.setSession(newToken, user, newRefreshToken);
    await cacheService.removeSession(refreshToken);

    return res.json({
      success: true,
      token: newToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    logger.error('Token refresh failed:', {
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

// Mock function for development
async function validateCredentials(username: string, password: string): Promise<User | null> {
  if (process.env.NODE_ENV === 'development') {
    const user: User = {
      id: '1',
      username: 'admin',
      role: 'admin' as const,
      is_active: true,
      email: 'admin@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return user;
  }
  return null;
}

router.post('/login', loginHandler);
router.get('/validate', validateHandler);
router.post('/logout', logoutHandler);
router.post('/refresh', refreshHandler);

export default router;
