import { compare } from 'bcrypt';
import { Response } from 'express';
import { sign } from 'jsonwebtoken';

import type { AuthResult } from '../../types';
import type { ApiResult } from '../../types/api-shared';
import type { User, LoginRequest } from '../../types/auth';
import { handleApiError } from '../../types/error';
import type { AuthenticatedRequest } from '../../types/express';
import { query } from '../db';
import { serverLogger as logger } from '../utils/serverLogger';

interface LoginRequestWithRemember extends LoginRequest {
  _remember?: boolean;
}

export async function login(
  req: AuthenticatedRequest<Record<string, never>, unknown, LoginRequestWithRemember>,
  res: Response,
): Promise<void> {
  const { username, password, _remember } = req.body;

  try {
    logger.info('Attempting login', { username });
    const result = await query<User>('SELECT * FROM users WHERE username = $1', [username]);

    const user = result.rows[0];
    if (!user || !user.password_hash) {
      logger.warn('Login failed: Invalid username', { username });
      res.status(401).json({
        success: false,
        error: 'Invalid username or password',
      });
      return;
    }

    const validPassword = await compare(password, user.password_hash);

    if (!validPassword) {
      logger.warn('Login failed: Invalid password', { username });
      res.status(401).json({
        success: false,
        error: 'Invalid username or password',
      });
      return;
    }

    const token = sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' },
    );

    const authResult: AuthResult = {
      success: true,
      token,
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
        email: undefined,
        lastLogin: user.last_login,
      },
    };

    const apiResult: ApiResult<AuthResult> = {
      success: true,
      data: authResult,
    };

    // Update last login timestamp
    await query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id],
    );

    logger.info('Login successful', {
      username,
      userId: user.id,
      role: user.role,
    });

    res.json(apiResult);
  } catch (error) {
    const errorResult = handleApiError<AuthResult>(error, 'login');
    logger.error('Login error:', {
      username,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json(errorResult);
  }
}

export async function validateToken(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      logger.warn('Token validation failed: No user in request');
      res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
      return;
    }

    logger.info('Token validated successfully', {
      userId: user.id,
      username: user.username,
    });

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    const errorResult = handleApiError(error, 'validateToken');
    res.status(500).json(errorResult);
  }
}

export async function refreshToken(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      logger.warn('Token refresh failed: No user in request');
      res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
      return;
    }

    const token = sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' },
    );

    logger.info('Token refreshed successfully', {
      userId: user.id,
      username: user.username,
    });

    res.json({
      success: true,
      data: { token },
    });
  } catch (error) {
    const errorResult = handleApiError(error, 'refreshToken');
    res.status(500).json(errorResult);
  }
}

export async function logout(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (user) {
      logger.info('User logged out', {
        userId: user.id,
        username: user.username,
      });
    }

    res.json({
      success: true,
    });
  } catch (error) {
    const errorResult = handleApiError(error, 'logout');
    res.status(500).json(errorResult);
  }
}
