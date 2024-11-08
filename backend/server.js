'use strict';

const http = require('http');

const cors = require('cors');
const express = require('express');
const { Server } = require('socket.io');

const cache = require('./cache');
const { pool } = require('./db');
const { errorHandler } = require('./middleware/auth');
const requestLogger = require('./middleware/requestLogger');
const routes = require('./routes');
const { initTerminalSocket } = require('./routes/terminal');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Initialize WebSocket handlers
initTerminalSocket(io);

// Routes
app.use('/api', routes);

// Error handling
app.use(errorHandler);

// Health check
app.get('/health', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT 1');
    await cache.redis.ping();

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbResult ? 'connected' : 'error',
        cache: 'connected',
        websocket: io.engine.clientsCount >= 0 ? 'connected' : 'error',
      },
    };

    logger.info('Health check passed', health);
    res.json(health);
  } catch (error) {
    const health = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      services: {
        database: error.message.includes('pool') ? 'error' : 'connected',
        cache: error.message.includes('redis') ? 'error' : 'connected',
        websocket: io.engine.clientsCount >= 0 ? 'connected' : 'error',
      },
    };

    logger.error('Health check failed', health);
    res.status(500).json(health);
  }
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Initiating graceful shutdown...');

  // Close WebSocket connections
  io.close(() => {
    logger.info('WebSocket server closed');
  });

  // Close database pool
  try {
    await pool.end();
    logger.info('Database pool closed');
  } catch (error) {
    logger.error('Error closing database pool', { error: error.message });
  }

  // Close Redis connection
  try {
    await cache.redis.quit();
    logger.info('Redis connection closed');
  } catch (error) {
    logger.error('Error closing Redis connection', { error: error.message });
  }

  // Close HTTP server
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force exit after timeout
  setTimeout(() => {
    logger.error('Forced shutdown: could not close connections in time');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    dbHost: process.env.DB_HOST,
    redisHost: process.env.REDIS_HOST,
  });
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack,
    type: 'uncaughtException',
  });
  shutdown();
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
    type: 'unhandledRejection',
  });
  shutdown();
});

module.exports = app;
