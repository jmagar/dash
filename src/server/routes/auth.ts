import { Router } from 'express';
import bcrypt from 'bcrypt';
import { generateToken, generateRefreshToken, verifyToken } from '../utils/jwt';
import { cacheService } from '../cache/CacheService';
import { logger } from '../utils/logger';
import config from '../config';
import type { 
  User, 
  AuthenticatedUser, 
  TokenPayload 
} from '../../types/auth';
import type { LogMetadata } from '../../types/logger';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Mock user lookup - replace with actual DB lookup
    const user: User = {
      id: '1',
      username,
      email: 'user@example.com',
      role: 'user',
      is_active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Mock password check - replace with actual password verification
    const validPassword = await bcrypt.compare(password, user.password_hash || '');
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        user: null,
        error: 'Invalid credentials'
      });
    }

    // Generate tokens
    const tokenPayload: Omit<TokenPayload, 'iat' | 'exp'> = {
      id: user.id,
      userId: user.id,
      username: user.username,
      role: user.role,
      is_active: user.is_active,
      type: 'access'
    };
    const token = await generateToken(tokenPayload);

    const refreshPayload: Omit<TokenPayload, 'type' | 'iat' | 'exp'> = {
      id: user.id,
      userId: user.id,
      username: user.username,
      role: user.role,
      is_active: user.is_active
    };
    const refreshToken = await generateRefreshToken(refreshPayload);

    const expiresAt = new Date(Date.now() + config.server.security.sessionMaxAge);

    // Store session
    const sessionData = {
      userId: user.id,
      username: user.username,
      role: user.role,
      is_active: user.is_active,
      refreshToken,
      expiresAt: expiresAt.toISOString()
    };

    await cacheService.setSession(token, user, refreshToken);

    const authenticatedUser = {
      ...user,
      token,
      refreshToken,
      expiresAt: expiresAt.toISOString()
    };

    return res.json({
      success: true,
      user: authenticatedUser
    });
  } catch (error) {
    const metadata: LogMetadata = {
      error: error instanceof Error ? error : String(error)
    };
    logger.error('Login error:', metadata);
    return res.status(500).json({
      success: false,
      user: null,
      error: 'Internal server error'
    });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    await cacheService.removeSession(token);
    return res.json({
      success: true
    });
  } catch (error) {
    const metadata: LogMetadata = {
      error: error instanceof Error ? error : String(error)
    };
    logger.error('Logout error:', metadata);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.get('/validate', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        user: null,
        error: 'No token provided'
      });
    }

    const rawSessionData = await cacheService.getSession(token);
    if (!rawSessionData || typeof rawSessionData !== 'object') {
      return res.status(401).json({
        success: false,
        error: 'Invalid session'
      });
    }

    const sessionData = rawSessionData as {
      userId: string;
      username: string;
      role: 'admin' | 'user';
      is_active: boolean;
      refreshToken: string;
      expiresAt: string;
    };

    const user: User = {
      id: sessionData.userId,
      username: sessionData.username,
      email: 'user@example.com',
      role: sessionData.role,
      is_active: sessionData.is_active,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const authenticatedUser = {
      ...user,
      token,
      refreshToken: sessionData.refreshToken,
      expiresAt: sessionData.expiresAt
    };

    return res.json({
      success: true,
      valid: true,
      user: authenticatedUser
    });
  } catch (error) {
    const metadata: LogMetadata = {
      error: error instanceof Error ? error : String(error)
    };
    logger.error('Validate error:', metadata);
    return res.status(500).json({
      success: false,
      valid: false,
      user: null,
      error: 'Internal server error'
    });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        token: '',
        refreshToken: '',
        error: 'No refresh token provided'
      });
    }

    const decoded = await verifyToken(refreshToken) as TokenPayload;
    if (!decoded || decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        token: '',
        refreshToken: '',
        error: 'Invalid refresh token'
      });
    }

    // Mock user lookup - replace with actual DB lookup
    const user: User = {
      id: decoded.id,
      username: decoded.username,
      email: 'user@example.com',
      role: decoded.role,
      is_active: decoded.is_active,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Generate new tokens
    const tokenPayload: Omit<TokenPayload, 'iat' | 'exp'> = {
      id: user.id,
      userId: user.id,
      username: user.username,
      role: user.role,
      is_active: user.is_active,
      type: 'access'
    };
    const newToken = await generateToken(tokenPayload);

    const refreshPayload: Omit<TokenPayload, 'type' | 'iat' | 'exp'> = {
      id: user.id,
      userId: user.id,
      username: user.username,
      role: user.role,
      is_active: user.is_active
    };
    const newRefreshToken = await generateRefreshToken(refreshPayload);

    const expiresAt = new Date(Date.now() + config.server.security.sessionMaxAge);

    // Update session
    const sessionData = {
      userId: user.id,
      username: user.username,
      role: user.role,
      is_active: user.is_active,
      refreshToken: newRefreshToken,
      expiresAt: expiresAt.toISOString()
    };

    await cacheService.setSession(newToken, user, newRefreshToken);

    return res.json({
      success: true,
      token: newToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    const metadata: LogMetadata = {
      error: error instanceof Error ? error : String(error)
    };
    logger.error('Refresh token error:', metadata);
    return res.status(500).json({
      success: false,
      token: '',
      refreshToken: '',
      error: 'Internal server error'
    });
  }
});

export default router;
