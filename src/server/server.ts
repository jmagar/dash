﻿import express, { json, urlencoded } from 'express';
import { Server as SocketServer } from 'socket.io';
import type { Socket } from 'socket.io';
import WebSocket from 'ws';
import type { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '../types/socket-events';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import fileUpload from 'express-fileupload';
import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'redis';
import config from './config';
import { LoggingManager } from './managers/LoggingManager';
import { errorHandler, notFoundHandler, corsConfig } from './middleware/security';
import { setupMetrics, metrics } from './metrics';
import { hostService } from './services/host.service';
import { AgentService } from './services/agent/services/agent.service';
import { ConnectionService } from './services/agent/services/connection.service';
import { MessageHandler } from './services/agent/services/message.handler';
import { MetricsService } from './services/agent/services/metrics.service';
import { PrismaClient } from '@prisma/client';
import routes from './routes';

interface ServerServices {
  hostService: typeof hostService;
  metrics: typeof metrics;
}

class Server {
  private readonly app: express.Application;
  private readonly httpServer: http.Server;
  private readonly io: SocketServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
  private readonly wsServer: WebSocket.Server;
  private readonly agentService: AgentService;
  private readonly services: ServerServices;

  constructor() {
    this.app = express();
    this.httpServer = http.createServer(this.app);
    
    // Initialize Socket.IO with proper types
    this.io = new SocketServer(this.httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    // Initialize WebSocket server for agent connections
    this.wsServer = new WebSocket.Server({ server: this.httpServer });

    // Initialize services with proper dependencies
    const prisma = new PrismaClient();
    const connectionService = new ConnectionService();
    const metricsService = new MetricsService();
    const messageHandler = new MessageHandler(metricsService, connectionService);

    this.agentService = AgentService.initialize(
      this.io as unknown as Socket,
      connectionService,
      messageHandler,
      metricsService
    );

    this.services = {
      hostService,
      metrics
    };
  }

  async initialize(): Promise<void> {
    try {
      // Initialize services
      await Promise.all([
        this.services.hostService.initialize(),
        this.services.metrics.initialize(),
      ]);

      // Setup Socket.IO middleware
      this.io.use((socket, next) => {
        try {
          socket.data = {
            authenticated: true,
            sessionId: socket.id,
          };
          next();
        } catch (error) {
          next(error instanceof Error ? error : new Error(String(error)));
        }
      });

      // Setup express middleware and routes
      this.app.use(helmet());
      this.app.use(cors(corsConfig));
      this.app.use(compression());
      this.app.use(json({ limit: '50mb' }));
      this.app.use(urlencoded({ extended: true, limit: '50mb' }));

      // File upload middleware
      const fileUploadMiddleware = fileUpload({
        limits: { fileSize: config.server.security.maxFileSize },
        abortOnLimit: true,
        createParentPath: true,
        useTempFiles: true,
        tempFileDir: config.server.logging.dir,
      }) as express.RequestHandler;

      this.app.use(fileUploadMiddleware);

      // Rate limiter configuration
      const redisClient = createClient({
        url: `redis://${config.server.redis.host}:${config.server.redis.port}`,
        database: config.server.redis.db,
        password: config.server.redis.password,
      });

      redisClient.on('error', (err) => {
        LoggingManager.getInstance().error('Redis client error:', {
          error: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : undefined,
        });
      });

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

      this.app.use(limiter);

      // Metrics
      setupMetrics(this.app, this.io);

      // Routes
      this.app.use('/api', routes);

      // Error handling
      this.app.use(notFoundHandler);
      this.app.use(errorHandler);

      // Socket.IO connection handling
      this.io.on('connection', (socket) => {
        LoggingManager.getInstance().info('Client connected:', {
          id: socket.id,
          handshake: {
            address: socket.handshake.address,
            time: socket.handshake.time,
            query: socket.handshake.query,
          },
        });

        socket.on('disconnect', () => {
          LoggingManager.getInstance().info('Client disconnected:', { id: socket.id });
        });

        socket.on('error', (error: Error) => {
          LoggingManager.getInstance().error('Socket error:', {
            id: socket.id,
            error: error.message,
            stack: error.stack,
          });
        });
      });

      // Start listening
      const port = config.server.port;
      this.httpServer.listen(port, () => {
        LoggingManager.getInstance().info(`Server started on port ${port}`);
      });
    } catch (error) {
      LoggingManager.getInstance().error('Failed to initialize server:', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    try {
      // Cleanup services
      await Promise.all([
        this.services.metrics.cleanup(),
      ]);

      // Close servers
      this.wsServer.close();
      this.io.close();
      this.httpServer.close();
    } catch (error) {
      LoggingManager.getInstance().error('Error during server cleanup:', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

const server = new Server();

server.initialize().catch((error) => {
  LoggingManager.getInstance().error('Error initializing server:', {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  LoggingManager.getInstance().info('SIGTERM received. Starting graceful shutdown...');
  server.cleanup().then(() => {
    process.exit(0);
  }).catch((error) => {
    LoggingManager.getInstance().error('Error during server cleanup:', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  });
});
