import bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import type { LoginResponse, LogoutResponse, ValidateResponse, AuthenticatedUser, DecodedToken } from '../../types/auth';
import { config } from '../config';
import { db } from '../db';
import { logger } from '../utils/logger';

export async function login(req: Request, res: Response<LoginResponse | { error: string }>) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required',
      });
    }

    const result = await db.query<AuthenticatedUser>(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password',
      });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash || '');

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password',
      });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    // Update last login
    await db.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      token,
      createdAt: user.createdAt,
      lastLogin: new Date(),
    };

    logger.info('User logged in successfully:', {
      userId: user.id,
      username: user.username,
    });

    return res.json({
      success: true,
      token,
      user: authenticatedUser,
    });
  } catch (error) {
    logger.error('Login failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export async function logout(req: Request, res: Response<LogoutResponse>) {
  try {
    // In a real implementation, you might want to invalidate the token
    // For now, we'll just return success
    return res.json({
      success: true,
    });
  } catch (error) {
    logger.error('Logout failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export async function validate(req: Request, res: Response<ValidateResponse | { error: string }>) {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        valid: false,
        error: 'No token provided',
      });
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as DecodedToken;
      const result = await db.query<AuthenticatedUser>(
        'SELECT * FROM users WHERE id = $1',
        [decoded.id]
      );

      const user = result.rows[0];

      if (!user) {
        return res.status(401).json({
          success: false,
          valid: false,
          error: 'Invalid token',
        });
      }

      const authenticatedUser: AuthenticatedUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
        token,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      };

      return res.json({
        success: true,
        valid: true,
        user: authenticatedUser,
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        valid: false,
        error: 'Invalid token',
      });
    }
  } catch (error) {
    logger.error('Token validation failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
