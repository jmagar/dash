import type { Server } from 'http';

import { logger } from './logger';
import cache from '../cache';
import { db } from '../db';
import { LoggingManager } from './logging/LoggingManager';

export function configureGracefulShutdown(server: Server) {
  // Handle process termination signals
  const signals = ['SIGTERM', 'SIGINT'] as const;

  signals.forEach((signal) => {
    process.on(signal, async () => {
      loggerLoggingManager.getInstance().();

      // Close HTTP server
      server.close(() => {
        loggerLoggingManager.getInstance().();
      });

      try {
        // Close database connections
        await db.end();
        loggerLoggingManager.getInstance().();

        // Close cache connections
        await cache.disconnect();
        loggerLoggingManager.getInstance().();

        // Exit process
        process.exit(0);
      } catch (error) {
        loggerLoggingManager.getInstance().();
        process.exit(1);
      }
    });
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    loggerLoggingManager.getInstance().();
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason) => {
    loggerLoggingManager.getInstance().(),
    });
    process.exit(1);
  });
}

