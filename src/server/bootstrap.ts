import type { Server } from 'http';
import { cacheService } from './cache/CacheService';
import { db } from './db';
import { server } from './server';
import { logger } from './utils/logger';

// Configure graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Starting graceful shutdown...');
  void shutdown(server);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Starting graceful shutdown...');
  void shutdown(server);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', {
    error: error instanceof Error ? error.message : 'Unknown error',
  });
  void shutdown(server);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection:', {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
  void shutdown(server);
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`);
});

export async function shutdown(httpServer: Server): Promise<void> {
  try {
    // Close HTTP server
    await new Promise<void>((resolve, reject) => {
      httpServer.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Disconnect from Redis
    await cacheService.disconnect();

    // Close database connections
    await db.end();

    logger.info('Server shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}
