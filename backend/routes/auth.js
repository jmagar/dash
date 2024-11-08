'use strict';

const bcrypt = require('bcrypt');
const express = require('express');
const jwt = require('jsonwebtoken');

const { pool } = require('../db');
const logger = require('../utils/logger');
const router = express.Router();

// Login route
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Get user from database
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username],
    );

    const user = result.rows[0];

    if (!user) {
      logger.warn('Login failed: User not found', { username });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      logger.warn('Login failed: Invalid password', { username });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || '30m' },
    );

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id],
    );

    logger.info('User logged in successfully', { username, userId: user.id });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        preferences: user.preferences,
      },
    });
  } catch (error) {
    logger.error('Login error', { error: error.message, username });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register route
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Check if user exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, email],
    );

    if (existingUser.rows.length > 0) {
      logger.warn('Registration failed: User exists', { username, email });
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, role, preferences)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, email, role, preferences`,
      [username, email, passwordHash, 'user', {}],
    );

    const user = result.rows[0];

    logger.info('User registered successfully', { username, userId: user.id });

    res.status(201).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        preferences: user.preferences,
      },
    });
  } catch (error) {
    logger.error('Registration error', { error: error.message, username, email });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Validate token route
router.post('/validate', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    logger.warn('Token validation failed: No token provided');
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query(
      'SELECT id, username, email, role, preferences FROM users WHERE id = $1',
      [decoded.id],
    );

    const user = result.rows[0];
    if (!user) {
      logger.warn('Token validation failed: User not found', { userId: decoded.id });
      return res.status(401).json({ error: 'Invalid token' });
    }

    logger.info('Token validated successfully', { userId: user.id });
    res.json({ user });
  } catch (error) {
    logger.error('Token validation error', { error: error.message });
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
