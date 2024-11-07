const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { errorHandler } = require('./middleware/auth');
const routes = require('./routes');
const { initTerminalSocket } = require('./routes/terminal');
const { pool } = require('./db');
const cache = require('./cache');

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
    await cache.redis.ping();

    res.json({
      status: 'healthy',
      services: {
        database: 'connected',
        cache: 'connected',
        websocket: io.engine.clientsCount >= 0 ? 'connected' : 'error',
      },
    });
  } catch (err) {
    res.status(500).json({
      status: 'unhealthy',
      error: err.message,
      services: {
        database: err.message.includes('pool') ? 'error' : 'connected',
        cache: err.message.includes('redis') ? 'error' : 'connected',
        websocket: io.engine.clientsCount >= 0 ? 'connected' : 'error',
      },
    });
  }
});

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down gracefully...');

  // Close WebSocket connections
  io.close(() => {
    console.log('WebSocket server closed');
  });

  // Close database pool
  await pool.end();
  console.log('Database pool closed');

  // Close Redis connection
  await cache.redis.quit();
  console.log('Redis connection closed');

  // Close HTTP server
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Frontend URL:', process.env.FRONTEND_URL || 'http://localhost:3000');
  console.log('Database host:', process.env.DB_HOST);
  console.log('Redis host:', process.env.REDIS_HOST);
});

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  shutdown();
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  shutdown();
});
