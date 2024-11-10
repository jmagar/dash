'use strict';

const jwt = require('jsonwebtoken');

const cache = require('../cache');
const { query } = require('../db');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No token provided',
    });
  }

  try {
    // Check cache first
    const cachedSession = await cache.getSession(token);
    if (cachedSession) {
      req.user = JSON.parse(cachedSession);
      return next();
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database with caching
    const result = await query(
      'SELECT * FROM users WHERE id = $1',
      [decoded.id],
      { cache: true, ttl: 3600, key: `user:${decoded.id}` },
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
      });
    }

    const user = result.rows[0];
    req.user = user;

    // Cache session
    await cache.cacheSession(token, JSON.stringify(user));
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
      });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }
    console.error('Authentication error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

const checkRole = (roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: 'Insufficient permissions',
    });
  }

  return next();
};

const rateLimiter = async (req, res, next) => {
  const key = `ratelimit:${req.ip}`;
  const limit = 100; // requests
  const window = 60; // seconds

  try {
    const current = await cache.redis.incr(key);
    if (current === 1) {
      await cache.redis.expire(key, window);
    }

    if (current > limit) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
      });
    }

    return next();
  } catch (err) {
    console.error('Rate limiter error:', err);
    // Continue on rate limiter error
    return next();
  }
};

const errorHandler = (err, req, res, _next) => {
  console.error('Error:', err);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON',
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }

  return res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
};

module.exports = {
  authenticateToken,
  checkRole,
  rateLimiter,
  errorHandler,
};
