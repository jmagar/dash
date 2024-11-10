'use strict';

const path = require('path');

const express = require('express');

const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const dockerRoutes = require('./docker');
const filesRoutes = require('./files');
const hostsRoutes = require('./hosts');
const packagesRoutes = require('./packages');
const { logger } = require(path.join(__dirname, '..', 'src', 'utils', 'logger'));

// Health check route
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/docker', dockerRoutes);
router.use('/files', filesRoutes);
router.use('/hosts', hostsRoutes);
router.use('/packages', packagesRoutes);

// Error handling for routes
router.use((err, req, res, _next) => {
  logger.error('Route error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

module.exports = router;
