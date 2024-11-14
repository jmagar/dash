import type { Server } from 'http';

import { logger } from './logger';
import cache from '../cache';
import { db } from '../db';

export function configureGracefulShutdown(server: Server) {
  // Handle process termination signals
  const signals = ['SIGTERM', 'SIGINT'] as const;

  signals.forEach((signal) => {
    process.on(signal, async () => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      // Close HTTP server
      server.close(() => {
        logger.info('HTTP server closed');
      });

      try {
        // Close database connections
        await db.end();
        logger.info('Database connections closed');

        // Close cache connections
        await cache.disconnect();
        logger.info('Cache connections closed');

        // Exit process
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown:', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        process.exit(1);
      }
    });
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection:', {
      reason: reason instanceof Error ? reason.message : String(reason),
    });
    process.exit(1);
  });
}
