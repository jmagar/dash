'use strict';

const path = require('path');

const bcrypt = require('bcrypt');
const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();
const cache = require('../cache');
const { pool } = require('../db');
const { logger } = require(path.join(__dirname, '..', '..', 'src', 'utils', 'logger'));

// Login route
router.post('/login', async (req, res) => {
  let client;

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
    const result = await client.query(
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
        error: bcryptError.message,
        stack: bcryptError.stack,
      });
      throw bcryptError;
    }

    // Generate JWT token
    logger.info('Generating JWT token');
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || '30m' },
    );

    // Cache session data if Redis is connected
    const sessionData = {
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
          error: cacheError.message,
          stack: cacheError.stack,
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
        error: updateError.message,
        stack: updateError.stack,
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
      error: error.message,
      stack: error.stack,
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
          error: releaseError.message,
          stack: releaseError.stack,
        });
      }
    }
  }
});

// Logout route
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token && cache.isConnected()) {
      await cache.redis.del(`${cache.CACHE_KEYS.SESSION}${token}`);
      logger.info('User logged out successfully');
    }
    res.json({ success: true });
  } catch (error) {
    logger.error('Logout error', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Validate token route
router.get('/validate', async (req, res) => {
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

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
      user: decoded,
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      logger.warn('Invalid token validation attempt', { error: error.message });
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }

    logger.error('Token validation error', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

module.exports = router;
