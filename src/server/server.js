'use strict';

const http = require('http');
const path = require('path');

const cors = require('cors');
const express = require('express');
const { Server } = require('socket.io');

const cache = require('./cache');
const { pool } = require('./db');
const routes = require('./routes');
const { initTerminalSocket } = require('./routes/terminal');
const { serverLogger: logger, requestLogger } = require('./utils/serverLogger');

// Create express app
const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parse JSON bodies
app.use(express.json());

// Request logging
app.use(requestLogger);

// Serve static files from the React build directory
app.use(express.static(path.join(__dirname, '..', 'build')));

// Error handler for JSON parsing
app.use((err, req, res, _next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    logger.error('JSON parsing error', { error: err.message });
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON',
    });
  }
  _next(err);
});

// Initialize WebSocket
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:4000',
    methods: ['GET', 'POST'],
  },
});

// Initialize WebSocket handlers
initTerminalSocket(io);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT 1');
    const redisConnected = cache.isConnected();

    res.json({
      success: true,
      status: 'healthy',
      services: {
        database: dbResult.rows[0] ? 'connected' : 'error',
        redis: redisConnected ? 'connected' : 'disconnected',
        websocket: io.engine.clientsCount >= 0 ? 'connected' : 'error',
      },
    });
  } catch (error) {
    logger.error('Health check failed', {
      error: error.message,
      stack: error.stack,
    });

    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      services: {
        database: 'error',
        redis: cache.isConnected() ? 'connected' : 'disconnected',
        websocket: io.engine.clientsCount >= 0 ? 'connected' : 'error',
      },
    });
  }
});

// API routes
app.use('/api', routes);

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'build', 'index.html'));
});

// Global error handler
app.use((err, req, res, _next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
  });

  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`, {
    environment: process.env.NODE_ENV,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4000',
    dbHost: process.env.DB_HOST,
    redisHost: process.env.REDIS_HOST,
  });
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Initiating graceful shutdown...');

  server.close(() => {
    logger.info('HTTP server closed');
  });

  io.close(() => {
    logger.info('WebSocket server closed');
  });

  try {
    await pool.end();
    logger.info('Database pool closed');
  } catch (err) {
    logger.error('Error closing database pool', {
      error: err.message,
      stack: err.stack,
    });
  }

  if (cache.isConnected()) {
    try {
      await cache.redis.quit();
      logger.info('Redis connection closed');
    } catch (err) {
      logger.error('Error closing Redis connection', {
        error: err.message,
        stack: err.stack,
      });
    }
  }

  process.exit(0);
};

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', {
    error: err.message,
    stack: err.stack,
  });
  shutdown();
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled rejection', {
    error: err.message,
    stack: err.stack,
  });
  shutdown();
});

module.exports = app;
