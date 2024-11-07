const express = require('express');
const router = express.Router();
const authRoutes = require('./auth');
const dockerRoutes = require('./docker');
const { authenticateToken, rateLimiter, errorHandler } = require('../middleware/auth');
const { healthCheck } = require('../db');

// Health check endpoint
router.get('/health', async (req, res) => {
  const status = await healthCheck();
  res.json(status);
});

// Apply rate limiting to all routes
router.use(rateLimiter);

// Public routes
router.use('/auth', authRoutes);

// Protected routes
router.use(authenticateToken);
router.use('/docker', dockerRoutes);

// Error handling
router.use(errorHandler);

module.exports = router;
