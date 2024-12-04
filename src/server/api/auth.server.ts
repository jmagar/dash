import { compare } from 'bcrypt';
import { Request, Response } from 'express';
import { sign, verify } from 'jsonwebtoken';

import type {
  LoginResponseDto,
  LogoutResponseDto,
  ValidateResponseDto,
  AuthenticatedUserDto,
  RefreshTokenRequestDto,
  RefreshTokenResponseDto,
  AccessTokenPayloadDto,
  RefreshTokenPayloadDto,
} from '../../types/auth';
import config from '../config';
import { db } from '../db';
import { LoggingManager } from '../managers/utils/LoggingManager';

interface UserRecord {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  is_active: boolean;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

function isJwtPayload(payload: unknown): payload is AccessTokenPayloadDto | RefreshTokenPayloadDto {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'id' in payload &&
    'username' in payload &&
    'role' in payload &&
    'is_active' in payload &&
    'type' in payload &&
    typeof payload.id === 'string' &&
    typeof payload.username === 'string' &&
    (payload.role === 'admin' || payload.role === 'user') &&
    typeof payload.is_active === 'boolean' &&
    (payload.type === 'access' || payload.type === 'refresh')
  );
}

export async function login(
  req: Request<unknown, LoginResponseDto | { error: string }, { username: string; password: string }>,
  res: Response<LoginResponseDto | { error: string }>
): Promise<void> {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({
        success: false,
        error: 'Username and password are required',
      });
      return;
    }

    const result = await db.query<UserRecord>(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    const user = result.rows[0];

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid username or password',
      });
      return;
    }

    const validPassword = await compare(password, user.password_hash);

    if (!validPassword) {
      res.status(401).json({
        success: false,
        error: 'Invalid username or password',
      });
      return;
    }

    const userData = {
      id: user.id,
      username: user.username,
      role: user.role,
      is_active: user.is_active,
    };

    const token = sign(
      { ...userData, type: 'access' as const },
      config.jwt.secret,
      { expiresIn: config.jwt.expiry }
    );

    const refreshToken = sign(
      { ...userData, type: 'refresh' as const },
      config.jwt.secret,
      { expiresIn: config.jwt.refreshExpiry }
    );

    // Update last login
    await db.query(
      'UPDATE users SET updated_at = NOW() WHERE id = $1',
      [user.id]
    );

    const authenticatedUser: AuthenticatedUserDto = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      token,
      refreshToken,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };

    res.json({
      success: true,
      token,
      refreshToken,
      user: authenticatedUser,
    });
  } catch (error) {
    LoggingManager.getInstance().error('Login failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

export async function logout(
  req: Request,
  res: Response<LogoutResponseDto>
): Promise<void> {
  try {
    // In a real implementation, you might want to invalidate the token
    // For now, we'll just simulate an async operation
    await Promise.resolve();
    res.json({
      success: true,
    });
  } catch (error) {
    LoggingManager.getInstance().error('Logout failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

export async function validate(
  req: Request,
  res: Response<ValidateResponseDto | { error: string }>
): Promise<void> {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        valid: false,
        error: 'No token provided',
      });
      return;
    }

    try {
      const decoded = verify(token, config.jwt.secret);

      if (!isJwtPayload(decoded)) {
        res.status(401).json({
          success: false,
          valid: false,
          error: 'Invalid token format',
        });
        return;
      }

      if (decoded.type !== 'access') {
        res.status(401).json({
          success: false,
          valid: false,
          error: 'Invalid token type',
        });
        return;
      }

      const result = await db.query<UserRecord>(
        'SELECT * FROM users WHERE id = $1',
        [decoded.id]
      );

      const user = result.rows[0];

      if (!user) {
        res.status(401).json({
          success: false,
          valid: false,
          error: 'Invalid token',
        });
        return;
      }

      const userData = {
        id: user.id,
        username: user.username,
        role: user.role,
        is_active: user.is_active,
      };

      // Generate a new refresh token during validation
      const newRefreshToken = sign(
        { ...userData, type: 'refresh' as const },
        config.jwt.secret,
        { expiresIn: config.jwt.refreshExpiry }
      );

      const authenticatedUser: AuthenticatedUserDto = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
        token,
        refreshToken: newRefreshToken,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      };

      res.json({
        success: true,
        valid: true,
        user: authenticatedUser,
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        valid: false,
        error: 'Invalid token',
      });
    }
  } catch (error) {
    LoggingManager.getInstance().error('Token validation failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      success: false,
      valid: false,
      error: 'Internal server error',
    });
  }
}

export async function refresh(
  req: Request<unknown, RefreshTokenResponseDto | { error: string }, RefreshTokenRequestDto>,
  res: Response<RefreshTokenResponseDto | { error: string }>
): Promise<void> {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: 'No refresh token provided',
      });
      return;
    }

    try {
      const decoded = verify(refreshToken, config.jwt.secret);

      if (!isJwtPayload(decoded)) {
        res.status(401).json({
          success: false,
          error: 'Invalid token format',
        });
        return;
      }

      if (decoded.type !== 'refresh') {
        res.status(401).json({
          success: false,
          error: 'Invalid token type',
        });
        return;
      }

      const result = await db.query<UserRecord>(
        'SELECT * FROM users WHERE id = $1',
        [decoded.id]
      );

      const user = result.rows[0];

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Invalid token',
        });
        return;
      }

      const userData = {
        id: user.id,
        username: user.username,
        role: user.role,
        is_active: user.is_active,
      };

      const newToken = sign(
        { ...userData, type: 'access' as const },
        config.jwt.secret,
        { expiresIn: config.jwt.expiry }
      );

      const newRefreshToken = sign(
        { ...userData, type: 'refresh' as const },
        config.jwt.secret,
        { expiresIn: config.jwt.refreshExpiry }
      );

      res.json({
        success: true,
        token: newToken,
        refreshToken: newRefreshToken,
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }
  } catch (error) {
    LoggingManager.getInstance().error('Token refresh failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}


