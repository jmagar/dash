import express, { json, urlencoded } from 'express';
import { Server } from 'socket.io';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import fileUpload from 'express-fileupload';
import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'redis';
import config from './config';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler, corsConfig, rateLimiter } from './middleware/security';
import { setupMetrics } from './metrics';
import { createProcessService } from './services/process';
import { initializeAgentService } from './services/agent.service';
import { ProcessMonitorFactory } from './services/process/process-monitor-factory';
import { ProcessCacheImpl } from './services/process/process-cache';
import { hostService } from './services/host.service';
import routes from './routes';

// Create Express app
const app = express();
const server = http.createServer(app);

// Configure Socket.IO
export const io = new Server(server, {
  cors: corsConfig,
});

// Initialize agent service
initializeAgentService(io);

// Initialize process monitor factory
const monitorFactory = new ProcessMonitorFactory(
  io,
  new ProcessCacheImpl(),
  hostService.listProcesses.bind(hostService),
  hostService.getHost.bind(hostService)
);

// Configure Redis rate limiter
const redisClient = createClient({
  url: `redis://${config.server.redis.host}:${config.server.redis.port}`,
  password: config.server.redis.password,
  database: config.server.redis.db,
});

redisClient.on('error', (err) => {
  logger.error('Redis client error:', err);
});

// Apply middleware
app.use(cors(corsConfig));
app.use(helmet());
app.use(compression());
app.use(json({ limit: config.server.security.maxFileSize }));
app.use(urlencoded({ extended: true, limit: config.server.security.maxFileSize }));
app.use(fileUpload({
  limits: { fileSize: config.server.security.maxFileSize },
  abortOnLimit: true,
  useTempFiles: true,
  tempFileDir: '/tmp/',
  debug: config.server.env === 'development',
}));

// Setup metrics if enabled
if (config.server.monitoring.enabled) {
  setupMetrics(app);
}

// Apply rate limiter to all routes
app.use(rateLimiter);

// Setup routes
app.use('/api', routes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const PORT = config.server.port;
const HOST = config.server.host;

server.listen(PORT, () => {
  logger.info(`Server running on ${HOST}:${PORT}`);
  logger.info(`Environment: ${config.server.env}`);
  
  if (config.server.monitoring.enabled) {
    logger.info(`Metrics available at ${config.server.monitoring.metricsPath}`);
  }
});

// Export server for testing
export { server };
