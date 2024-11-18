import express from 'express';
import { Server } from 'socket.io';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import fileUpload from 'express-fileupload';
import { rateLimit } from 'express-rate-limit';
import { createClient } from 'redis';
import { RedisStore } from 'rate-limit-redis';

import { config } from './config';
import { logger } from './utils/logger';
import routes from './routes';
import { setupMetrics } from './metrics';
import { errorHandler, notFoundHandler } from './middleware/error';
import { requestTracer } from './middleware/requestTracer';
import { securityHeaders } from './middleware/security';
import { ProcessMonitorFactory } from './services/process/process-monitor-factory';
import { ProcessCacheImpl } from './services/process/process-cache';
import { hostService } from './services/host.service';
import { initializeAgentService } from './services/agent.service';
import { createProcessService } from './services/process';

// Create Express app
const app = express();
const server = http.createServer(app);

// Configure Socket.IO
export const io = new Server(server, {
  cors: {
    origin: config.cors.origin,
    methods: config.cors.methods,
    allowedHeaders: config.cors.allowedHeaders,
    exposedHeaders: config.cors.exposedHeaders,
    credentials: config.cors.credentials,
    maxAge: config.cors.maxAge,
  },
});

// Initialize agent service
initializeAgentService(io);

// Initialize process monitoring
const processCache = new ProcessCacheImpl();
const monitorFactory = new ProcessMonitorFactory(
  io,
  processCache,
  hostService.listProcesses.bind(hostService),
  hostService.getHost.bind(hostService)
);

// Initialize process service with configuration
const processService = createProcessService(io, {
  monitorFactory,
  defaultInterval: config.process?.monitorInterval || 5000,
  maxMonitoredHosts: config.process?.maxMonitoredHosts || 100,
  includeChildren: config.process?.includeChildren ?? true,
  excludeSystemProcesses: config.process?.excludeSystemProcesses ?? false,
  sortBy: config.process?.sortBy || 'cpu',
  sortOrder: config.process?.sortOrder || 'desc',
  maxProcesses: config.process?.maxProcesses || 100
});

// Configure Redis rate limiter
const redisClient = createClient({
  url: `redis://${config.redis.host}:${config.redis.port}`,
  password: config.redis.password,
});

redisClient.on('error', (err) => {
  logger.error('Redis client error:', err);
});

const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: async (command: string, ...args: string[]) => redisClient.sendCommand([command, ...args]),
  }),
});

// Apply middleware
app.use(cors({
  origin: config.cors.origin,
  methods: config.cors.methods,
  allowedHeaders: config.cors.allowedHeaders,
  exposedHeaders: config.cors.exposedHeaders,
  credentials: config.cors.credentials,
  maxAge: config.cors.maxAge,
}));
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: config.server.maxRequestSize }));
app.use(express.urlencoded({ extended: true, limit: config.server.maxRequestSize }));
app.use(fileUpload({
  limits: { fileSize: config.security.maxFileSize },
  abortOnLimit: true,
}));
app.use(requestTracer);
app.use(securityHeaders);
app.use(limiter);

// Setup routes
app.use('/api', routes);

// Setup Prometheus metrics
setupMetrics(app);

// Error handling
app.use(errorHandler);
app.use(notFoundHandler);

// Start server
const port = config.server.port;
server.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});

// Handle process termination
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Cleaning up...');
  processService.stop();
  await redisClient.quit();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Cleaning up...');
  processService.stop();
  await redisClient.quit();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Export server for use in bootstrap.ts
export { server, processService };
