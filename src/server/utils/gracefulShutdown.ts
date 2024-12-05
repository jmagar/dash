import type { Server } from 'http';
import { LoggingManager } from './logging/LoggingManager';
import db from '../db';
import { CacheManager } from '../managers/CacheManager';

const logger = LoggingManager.getInstance();
const cache = CacheManager.getInstance();

export function configureGracefulShutdown(server: Server): void {
  // Handle process termination signals
  const signals = ['SIGTERM', 'SIGINT'] as const;

  signals.forEach((signal) => {
    // Using a void function wrapper to handle the async operation
    process.on(signal, () => {
      void (async () => {
        try {
          logger.info(`Received ${signal} signal, starting graceful shutdown...`);

          // Close HTTP server first
          await new Promise<void>((resolve) => {
            server.close(() => {
              logger.info('HTTP server closed');
              resolve();
            });
          });

          // Close database connections
          await db.end();
          logger.info('Database connections closed');

          // Close cache connections
          await cache.cleanup();
          logger.info('Cache connections closed');

          // Exit process
          process.exit(0);
        } catch (error) {
          logger.error('Error during graceful shutdown', { 
            error: error instanceof Error ? error : new Error(String(error))
          });
          process.exit(1);
        }
      })();
    });
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught exception', { error });
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('Unhandled promise rejection', {
      error: reason instanceof Error ? reason : new Error(String(reason))
    });
    process.exit(1);
  });
}
