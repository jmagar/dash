import express, { json, urlencoded } from 'express';
import { Server } from 'socket.io';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import fileUpload from 'express-fileupload';
import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'redis';
import config from './config';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler, corsConfig } from './middleware/security';
import { setupMetrics, metrics } from './metrics';
import { ProcessMonitorFactory } from './services/process/process-monitor-factory';
import { ProcessCacheImpl } from './services/process/process-cache';
import { hostService } from './services/host.service';
import { initializeAgentService } from './services/agent.service';
import routes from './routes';

// Create Express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Socket.IO Configuration
const socketConfig = {
  cors: {
    origin: config.server.cors.origin,
    methods: config.server.cors.methods,
    allowedHeaders: config.server.cors.allowedHeaders.split(','),
    credentials: config.server.cors.credentials
  },
  pingTimeout: 60000,
  pingInterval: 25000,
} as const;

// Configure Socket.IO with proper config
const io = new Server(server, socketConfig);

// Initialize Redis client for rate limiting
const redisClient = createClient({
  url: `redis://${config.server.redis.host}:${config.server.redis.port}`,
  database: config.server.redis.db,
  password: config.server.redis.password,
});

redisClient.on('error', (err) => {
  logger.error('Redis client error:', {
    error: err instanceof Error ? err.message : 'Unknown error',
    stack: err instanceof Error ? err.stack : undefined,
  });
});

// Rate limiter configuration
const limiter = rateLimit({
  windowMs: config.server.rateLimit.windowMs,
  max: config.server.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    prefix: 'rate-limit:',
  }),
});

// Initialize services
const processCache = new ProcessCacheImpl();
const processMonitorFactory = new ProcessMonitorFactory(processCache);

// Middleware
app.use(helmet());
app.use(cors(corsConfig));
app.use(compression());
app.use(json({ limit: '50mb' }));
app.use(urlencoded({ extended: true, limit: '50mb' }));
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  abortOnLimit: true,
  createParentPath: true,
  useTempFiles: true,
  tempFileDir: config.server.uploads.tempDir,
}));
app.use(limiter);

// Metrics
setupMetrics(app);

// Routes
app.use('/api', routes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info('Client connected:', {
    id: socket.id,
    handshake: {
      address: socket.handshake.address,
      time: socket.handshake.time,
      query: socket.handshake.query,
    },
  });

  socket.on('disconnect', () => {
    logger.info('Client disconnected:', { id: socket.id });
  });

  socket.on('error', (error: Error) => {
    logger.error('Socket error:', {
      id: socket.id,
      error: error.message,
      stack: error.stack,
    });
  });
});

// Start server
const PORT = config.server.port;
server.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`);

  // Initialize services
  void hostService.initialize();
  void initializeAgentService();

  // Start metrics collection
  metrics.startCollection();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Starting graceful shutdown...');

  // Stop metrics collection
  metrics.stopCollection();

  // Close server
  server.close((err) => {
    if (err) {
      logger.error('Error closing server:', {
        error: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
      });
      process.exit(1);
    }

    // Close Redis client
    void redisClient.quit();

    logger.info('Server closed successfully');
    process.exit(0);
  });
});
