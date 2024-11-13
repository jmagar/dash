import { createServer } from 'http';

import compression from 'compression';
import helmet from 'helmet';
import { Server } from 'socket.io';

import cors from 'cors';
import express from 'express';

import { cacheService } from './cache/CacheService';
import { db } from './db';
import { configureApplicationHandlers } from './middleware/applicationHandler';
import routes from './routes';
import { setupGracefulShutdown } from './utils/gracefulShutdown';
import { logger } from './utils/logger';
import { createApiError } from '../types/error';
import type { LogMetadata } from '../types/logger';

async function initializeServices(): Promise<void> {
  try {
    // Check database connection
    const dbHealth = await db.healthCheck();
    if (!dbHealth.connected) {
      const metadata: LogMetadata = {
        error: dbHealth.error,
      };
      logger.error('Database connection failed:', metadata);
      throw createApiError(`Database connection failed: ${dbHealth.error}`, 500, metadata);
    }

    // Check cache connection
    const cacheHealth = await cacheService.healthCheck();
    if (!cacheHealth.connected) {
      const metadata: LogMetadata = {
        error: cacheHealth.error,
      };
      logger.error('Cache connection failed:', metadata);
      throw createApiError(`Cache connection failed: ${cacheHealth.error}`, 500, metadata);
    }

    logger.info('Services initialized successfully');
  } catch (error) {
    const metadata: LogMetadata = {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Service initialization failed:', metadata);
    throw createApiError(
      'Failed to initialize services',
      500,
      metadata,
    );
  }
}

export function createApplication(): express.Application {
  const app = express();

  // Basic security middleware
  app.use(helmet());

  // CORS configuration
  const corsOptions = {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400, // 24 hours
  };
  app.use(cors(corsOptions));

  // Compression middleware
  app.use(compression());

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Configure application handlers (logging, monitoring, error handling)
  configureApplicationHandlers(app);

  // Mount routes
  app.use('/api', routes);

  return app;
}

async function startServer(): Promise<void> {
  try {
    // Initialize services
    await initializeServices();

    // Create Express application
    const app = createApplication();

    // Create HTTP server
    const server = createServer(app);

    // Create Socket.IO server
    const io = new Server(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
      },
    });

    // Configure WebSocket events
    io.on('connection', (socket) => {
      logger.info('Client connected', { socketId: socket.id });

      socket.on('disconnect', () => {
        logger.info('Client disconnected', { socketId: socket.id });
      });
    });

    // Configure graceful shutdown
    setupGracefulShutdown(server);

    // Start server
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = process.env.HOST || 'localhost';

    server.listen(port, () => {
      const metadata: LogMetadata = {
        host,
        port,
        nodeEnv: process.env.NODE_ENV,
        nodeVersion: process.version,
        platform: process.platform,
        memoryUsage: process.memoryUsage(),
      };
      logger.info('Server started', metadata);
    });
  } catch (error) {
    const metadata: LogMetadata = {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to start application:', metadata);
    process.exit(1);
  }
}

// Handle unhandled errors
process.on('unhandledRejection', (error: unknown) => {
  const metadata: LogMetadata = {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
  };
  logger.error('Unhandled rejection:', metadata);
});

process.on('uncaughtException', (error: Error) => {
  const metadata: LogMetadata = {
    error: error.message,
    stack: error.stack,
  };
  logger.error('Uncaught exception:', metadata);
  process.exit(1);
});

// Start the server if this is the main module
if (require.main === module) {
  startServer().catch((error) => {
    const metadata: LogMetadata = {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Unhandled error during startup:', metadata);
    process.exit(1);
  });
}

// Export for testing
export { startServer, initializeServices };
