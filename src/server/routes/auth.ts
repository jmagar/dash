import bcrypt from 'bcrypt';
import express, { Request, Response, Router } from 'express';
import { sign, verify } from 'jsonwebtoken';

import { DecodedToken, JwtPayload } from '../../types/jwt';
import { serverLogger as logger } from '../../utils/serverLogger';
import cache, { CACHE_KEYS } from '../cache';
import { pool } from '../db';

const router: Router = express.Router();

interface LoginRequest {
  username: string;
  password: string;
}

interface User {
  id: string;
  username: string;
  password_hash: string;
  role: string;
}

interface SessionData {
  id: string;
  username: string;
  role: string;
}

interface AuthResponse {
  success: boolean;
  token?: string;
  user?: SessionData;
  error?: string;
}

// Login route
router.post('/login', async (req: Request<unknown, AuthResponse, LoginRequest>, res: Response<AuthResponse>) => {
  let client = null;

  try {
    logger.info('Starting login process');
    const { username, password } = req.body;

    // Input validation
    if (!username || !password) {
      logger.warn('Login attempt with missing credentials');
      return res.status(400).json({
        success: false,
        error: 'Username and password are required',
      });
    }

    // Get database client
    client = await pool.connect();
    logger.info('Database connection acquired');

    // Query user from database
    logger.info('Querying database for user', { username });
    const result = await client.query<User>(
      'SELECT id, username, password_hash, role FROM users WHERE username = $1 AND is_active = true',
      [username],
    );

    const user = result.rows[0];
    logger.info('Database query completed', { userFound: !!user });

    // Check if user exists
    if (!user) {
      logger.warn('Login attempt with invalid username', { username });
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Verify password
    try {
      logger.info('Verifying password');
      logger.debug('Password verification details', {
        hasPasswordHash: !!user.password_hash,
        passwordLength: password.length,
      });

      const validPassword = await bcrypt.compare(password, user.password_hash);

      if (!validPassword) {
        logger.warn('Login attempt with invalid password', { username });
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
      }
    } catch (bcryptError) {
      logger.error('Password verification failed', {
        error: (bcryptError as Error).message,
        stack: (bcryptError as Error).stack,
      });
      throw bcryptError;
    }

    // Generate JWT token
    logger.info('Generating JWT token');
    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
    };

    const token = sign(
      tokenPayload,
      process.env.JWT_SECRET || '',
      { expiresIn: process.env.JWT_EXPIRATION || '30m' },
    );

    // Cache session data if Redis is connected
    const sessionData: SessionData = {
      id: user.id,
      username: user.username,
      role: user.role,
    };

    if (cache.isConnected()) {
      try {
        logger.info('Caching session data');
        await cache.cacheSession(token, JSON.stringify(sessionData));
      } catch (cacheError) {
        logger.error('Failed to cache session', {
          error: (cacheError as Error).message,
          stack: (cacheError as Error).stack,
        });
        // Continue even if caching fails
      }
    } else {
      logger.warn('Redis not connected, skipping session caching');
    }

    // Update last login timestamp
    try {
      logger.info('Updating last login timestamp');
      await client.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id],
      );
    } catch (updateError) {
      logger.error('Failed to update last login', {
        error: (updateError as Error).message,
        stack: (updateError as Error).stack,
      });
      // Continue even if update fails
    }

    // Return success response
    logger.info('Login successful', { username });
    return res.status(200).json({
      success: true,
      token,
      user: sessionData,
    });

  } catch (error) {
    logger.error('Login process error', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      body: req.body,
    });

    // Ensure we send a response
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  } finally {
    if (client) {
      try {
        client.release();
        logger.info('Database connection released');
      } catch (releaseError) {
        logger.error('Error releasing database connection', {
          error: (releaseError as Error).message,
          stack: (releaseError as Error).stack,
        });
      }
    }
  }
});

// Logout route
router.post('/logout', async (req: Request, res: Response<AuthResponse>) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token && cache.isConnected()) {
      await cache.redis.del(`${CACHE_KEYS.SESSION}${token}`);
      logger.info('User logged out successfully');
    }
    res.json({ success: true });
  } catch (error) {
    logger.error('Logout error', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

interface ValidateResponse extends AuthResponse {
  user?: JwtPayload;
}

// Validate token route
router.get('/validate', async (req: Request, res: Response<ValidateResponse>) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      logger.warn('Token validation attempt without token');
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }

    // Verify JWT token
    const result = verify(token, process.env.JWT_SECRET || '');
    if (typeof result === 'string') {
      throw new Error('Invalid token format');
    }

    const decoded = result as unknown as DecodedToken;
    const payload: JwtPayload = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
    };

    // Check if session exists in cache if Redis is connected
    if (cache.isConnected()) {
      const session = await cache.getSession(token);
      if (!session) {
        logger.warn('Token validation with expired session');
        return res.status(401).json({
          success: false,
          error: 'Session expired',
        });
      }
    }

    logger.info('Token validated successfully');
    res.json({
      success: true,
      user: payload,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError')
    ) {
      logger.warn('Invalid token validation attempt', { error: error.message });
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }

    logger.error('Token validation error', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
