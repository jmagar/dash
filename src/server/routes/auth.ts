import { compare } from 'bcrypt';
import { Router, Response, Request } from 'express';
import { sign, verify } from 'jsonwebtoken';

import {
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  RequestParams,
  SessionData,
  User,
  ValidateResponse,
} from '../../types/auth';
import { createAuthHandler } from '../../types/express';
import { JWTPayload, TokenError } from '../../types/jwt';
import { serverLogger as logger } from '../../utils/serverLogger';
import { isConnected, cacheSession, redis, CACHE_KEYS, getSession } from '../cache';
import { pool } from '../db';

const router: Router = Router();

// Login route
router.post(
  '/login',
  async (req: Request<RequestParams, LoginResponse, LoginRequest>, res: Response<LoginResponse>) => {
    let client;

    try {
      // If auth is disabled, return dev user
      if (process.env.DISABLE_AUTH === 'true') {
        const devUser = {
          id: 'dev',
          username: 'dev',
          role: 'admin',
        };
        return res.status(200).json({
          success: true,
          token: 'dev-token',
          user: devUser,
        });
      }

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

      // Check if user exists and has password hash
      if (!user || !user.password_hash) {
        logger.warn('Login attempt with invalid username or missing password hash', { username });
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
      }

      // Verify password
      try {
        logger.info('Verifying password');
        logger.debug('Password verification details', {
          hasPasswordHash: true,
          passwordLength: password.length,
        });

        const validPassword = await compare(password, user.password_hash);

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
      const token = sign(
        {
          id: user.id,
          username: user.username,
          role: user.role,
        },
        process.env.JWT_SECRET || '',
        { expiresIn: process.env.JWT_EXPIRATION || '30m' },
      );

      // Cache session data if Redis is connected
      const sessionData: SessionData = {
        id: user.id,
        username: user.username,
        role: user.role,
      };

      if (isConnected()) {
        try {
          logger.info('Caching session data');
          await cacheSession(token, JSON.stringify(sessionData));
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
  },
);

// Logout route
router.post(
  '/logout',
  createAuthHandler<RequestParams, LogoutResponse>(async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (token && isConnected()) {
        await redis.del(`${CACHE_KEYS.SESSION}${token}`);
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
  }),
);

// Validate token route
router.get(
  '/validate',
  async (req: Request, res: Response<ValidateResponse>) => {
    try {
      // If auth is disabled, return dev user
      if (process.env.DISABLE_AUTH === 'true') {
        return res.json({
          success: true,
          user: {
            id: 'dev',
            username: 'dev',
            role: 'admin',
          },
        });
      }

      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        logger.warn('Token validation attempt without token');
        return res.status(401).json({
          success: false,
          error: 'No token provided',
        });
      }

      // Verify JWT token
      const decodedToken = verify(token, process.env.JWT_SECRET || '');
      if (
        typeof decodedToken !== 'object' ||
        !('id' in decodedToken) ||
        !('username' in decodedToken) ||
        !('role' in decodedToken)
      ) {
        throw new Error('Invalid token format');
      }

      const decoded = decodedToken as JWTPayload;

      // Check if session exists in cache if Redis is connected
      if (isConnected()) {
        const session = await getSession(token);
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
        user: {
          id: decoded.id,
          username: decoded.username,
          role: decoded.role,
        },
      });
    } catch (error) {
      const err = error as TokenError;
      if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        logger.warn('Invalid token validation attempt', { error: err.message });
        return res.status(401).json({
          success: false,
          error: 'Invalid token',
        });
      }

      logger.error('Token validation error', {
        error: err.message,
        stack: err.stack,
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  },
);

export default router;
