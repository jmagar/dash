'use strict';

const http = require('http');
const net = require('net');

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

// Use environment variable for port
const PORT = process.env.PORT || 4000;

const startServer = async () => {
  // Initialize Redis
  await cache.initialize();

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  // Middleware
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  }));
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
      // Check database connection
      await pool.query('SELECT 1');

      // Check Redis connection
      const redisHealthy = await cache.healthCheck();

      if (!redisHealthy) {
        throw new Error('Redis health check failed');
      }

      res.json({
        status: 'healthy',
        services: {
          database: 'connected',
          cache: 'connected',
          websocket: io.engine.clientsCount >= 0 ? 'connected' : 'error',
        },
      });
    } catch (err) {
      logger.error('Health check failed', { error: err.message });
      res.status(500).json({
        status: 'unhealthy',
        error: err.message,
        services: {
          database: err.message.includes('pool') ? 'error' : 'connected',
          cache: err.message.includes('Redis') ? 'error' : 'connected',
          websocket: io.engine.clientsCount >= 0 ? 'connected' : 'error',
        },
      });
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
    await pool.end();
    logger.info('Database pool closed');

    // Close Redis connection
    await cache.redis.quit();
    logger.info('Redis connection closed');

    // Close HTTP server
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  // Handle shutdown signals
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // Handle uncaught errors
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', {
      error: err.message,
      stack: err.stack,
      type: 'uncaughtException',
    });
    shutdown();
  });

  process.on('unhandledRejection', (err) => {
    logger.error('Unhandled rejection', {
      error: err.message,
      stack: err.stack,
      type: 'unhandledRejection',
    });
    shutdown();
  });

  // Start server
  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`, {
      environment: process.env.NODE_ENV,
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
      dbHost: process.env.DB_HOST,
      redisHost: process.env.REDIS_HOST,
    });
  });
};

// Check if port is available before starting
const testServer = net.createServer()
  .once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`Port ${PORT} is already in use`);
      process.exit(1);
    } else {
      logger.error('Error checking port availability', { error: err.message });
      process.exit(1);
    }
  })
  .once('listening', () => {
    testServer.close(() => {
      startServer().catch((err) => {
        logger.error('Failed to start server', { error: err.message });
        process.exit(1);
      });
    });
  })
  .listen(PORT);
