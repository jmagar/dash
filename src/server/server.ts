import path from 'path';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import { security, corsConfig } from './middleware/security';
import { authenticate } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { requestTracer, performanceMonitor } from './middleware/requestTracer';
import routes from './routes';
import { logger } from './utils/logger';
import { config } from './config';

// Validate required environment variables in production
if (process.env.NODE_ENV === 'production') {
  for (const envVar of ['JWT_SECRET', 'POSTGRES_HOST', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB', 'REDIS_HOST']) {
    if (!process.env[envVar]) {
      logger.error(`Missing required environment variable: ${envVar}`);
      process.exit(1);
    }
  }
}

const app = express();
const PORT = config.server.port;

// Apply security middleware stack
app.use(security);

// Basic middleware
app.use(compression());
app.use(cors(corsConfig));
app.use(express.json({ limit: config.server.maxRequestSize }));
app.use(express.urlencoded({ extended: true, limit: config.server.maxRequestSize }));

// Request processing middleware
app.use(requestLogger);
app.use(requestTracer);
app.use(performanceMonitor);

// Authentication middleware for API routes
app.use('/api', authenticate);

// API routes
app.use('/api', routes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../build')));
  
  // Serve React app for all other routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../build/index.html'));
  });
}

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received. Closing server...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received. Closing server...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Error handling for uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception:', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled rejection:', {
    error: reason instanceof Error ? reason.message : 'Unknown error',
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  process.exit(1);
});

export default app;
