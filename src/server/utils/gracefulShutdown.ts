import type { Server } from 'http';

import { logger } from './logger';
import type { LogMetadata } from '../../types/logger';
import cache from '../cache';
import { db } from '../db';
import { errorAggregator } from '../services/errorAggregator';

/**
 * Setup graceful shutdown handlers
 */
export function setupGracefulShutdown(server: Server): void {
  // Handle process termination signals
  process.on('SIGTERM', () => handleShutdown(server));
  process.on('SIGINT', () => handleShutdown(server));

  logger.info('Graceful shutdown handlers configured');
}

/**
 * Handle the shutdown process
 */
async function handleShutdown(server: Server): Promise<void> {
  logger.info('Starting graceful shutdown...');

  try {
    // Close server first to stop accepting new connections
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) {
          logger.error('Error closing server:', { error: err.message });
          reject(err);
        } else {
          logger.info('Server closed successfully');
          resolve();
        }
      });
    });

    // Cleanup resources
    await Promise.allSettled([
      closeDatabase(),
      closeCache(),
      // Add other cleanup tasks here
    ]);

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    const metadata: LogMetadata = {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Error during graceful shutdown:', metadata);
    errorAggregator.trackError(
      error instanceof Error ? error : new Error('Graceful shutdown failed'),
      metadata,
    );
    process.exit(1);
  }
}

async function closeDatabase(): Promise<void> {
  try {
    // Close all database connections in the pool
    await db.pool.end();
    logger.info('Database connections closed');
  } catch (error) {
    const metadata: LogMetadata = {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Error closing database connections:', metadata);
    throw error;
  }
}

async function closeCache(): Promise<void> {
  try {
    // Close Redis connection through the Redis manager
    await cache.redis.shutdown();
    logger.info('Cache connections closed');
  } catch (error) {
    const metadata: LogMetadata = {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Error closing cache connections:', metadata);
    throw error;
  }
}
