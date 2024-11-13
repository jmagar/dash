
import cache from './cache';
import { db } from './db';
import server from './server';
import { logger } from './utils/logger';

// Configure graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Starting graceful shutdown...');

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

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`);
});
