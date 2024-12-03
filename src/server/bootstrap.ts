import 'reflect-metadata';
import type { Server } from 'http';
import { cacheService } from './cache/CacheService';
import { db } from './db';
import { server } from './server';
import { LoggingManager } from '../utils/logging/LoggingManager';
import { metrics } from './metrics';
import config from './config';

// Configure graceful shutdown
async function handleShutdownSignal(signal: string): Promise<void> {
  LoggingManager.getInstance().info(`${signal} received. Starting graceful shutdown...`);
  await shutdown(server);
}

process.on('SIGTERM', () => {
  void handleShutdownSignal('SIGTERM');
});

process.on('SIGINT', () => {
  void handleShutdownSignal('SIGINT');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  LoggingManager.getInstance().error('Uncaught exception:', {
    error: error.message,
    stack: error.stack,
  });
  void shutdown(server);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown) => {
  LoggingManager.getInstance().error('Unhandled promise rejection:', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  void shutdown(server);
});

// Start server using port from config
server.listen(config.server.port, () => {
  LoggingManager.getInstance().info(`Server listening on port ${config.server.port}`);
  
  // Record server start metric
  metrics.hostMetrics.set({ metric_type: 'server_start' }, Date.now());
});

export async function shutdown(httpServer: Server): Promise<void> {
  try {
    LoggingManager.getInstance().info('Starting graceful shutdown...');

    // Record shutdown metric
    metrics.hostMetrics.set({ metric_type: 'server_shutdown' }, Date.now());

    // Close HTTP server first to stop accepting new requests
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

    LoggingManager.getInstance().info('Server shutdown complete');
    process.exit(0);
  } catch (error) {
    LoggingManager.getInstance().error('Error during shutdown:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

