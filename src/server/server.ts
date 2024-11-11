import fs from 'fs';
import http from 'http';
import path from 'path';

import cors from 'cors';
import express, {
  Request,
  Response,
  NextFunction,
  json as expressJson,
  static as expressStatic,
} from 'express';

import {
  isConnected as cacheIsConnected,
  redis as cacheRedis,
} from './cache';
import { pool } from './db';
import routes from './routes';
import { initTerminalSocket } from './routes/terminal';
import { serverLogger as logger } from './utils/serverLogger';

// Import socket.io using require since it has issues with ES modules
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Server: SocketServer } = require('socket.io');

// Create express app
const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parse JSON bodies
app.use(expressJson());

// Request logging middleware
const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request processed', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
};

app.use(requestLogger);

// Serve static files from the React build directory
const buildPath = path.resolve(__dirname, '../../build');
app.use(expressStatic(buildPath));

// Error handler for JSON parsing
app.use((err: Error & { status?: number; body?: unknown }, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    logger.error('JSON parsing error', { error: err.message });
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON',
    });
  }
  _next(err);
});

// Initialize WebSocket
const io = new SocketServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:4000',
    methods: ['GET', 'POST'],
  },
});

// Initialize WebSocket handlers
initTerminalSocket(io);

interface HealthCheckResponse {
  success: boolean;
  status: string;
  services: {
    database: string;
    redis: string;
    websocket: string;
  };
  error?: string;
}

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  try {
    const dbResult = await pool.query('SELECT 1');
    const redisConnected = cacheIsConnected();

    const response: HealthCheckResponse = {
      success: true,
      status: 'healthy',
      services: {
        database: dbResult.rows[0] ? 'connected' : 'error',
        redis: redisConnected ? 'connected' : 'disconnected',
        websocket: io.engine.clientsCount >= 0 ? 'connected' : 'error',
      },
    };

    res.json(response);
  } catch (error) {
    logger.error('Health check failed', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });

    const response: HealthCheckResponse = {
      success: false,
      status: 'unhealthy',
      error: (error as Error).message,
      services: {
        database: 'error',
        redis: cacheIsConnected() ? 'connected' : 'disconnected',
        websocket: io.engine.clientsCount >= 0 ? 'connected' : 'error',
      },
    };

    res.status(503).json(response);
  }
});

// API routes
app.use('/api', routes);

// Serve React app for all other routes
app.get('*', (_req: Request, res: Response) => {
  try {
    const indexPath = path.resolve(buildPath, 'index.html');
    if (!fs.existsSync(indexPath)) {
      throw new Error('index.html not found');
    }
    res.sendFile('index.html', { root: buildPath }, (err?: Error) => {
      if (err) {
        logger.error('Error serving index.html', {
          error: err.message,
          stack: err.stack,
        });
        if (!res.headersSent) {
          res.status(500).send('Internal Server Error');
        }
      }
    });
  } catch (error) {
    logger.error('Error serving index.html', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    if (!res.headersSent) {
      res.status(500).send('Internal Server Error');
    }
  }
});

// Global error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
  });

  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`, {
    environment: process.env.NODE_ENV,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4000',
    dbHost: process.env.DB_HOST,
    redisHost: process.env.REDIS_HOST,
  });
});

// Graceful shutdown
const shutdown = async (): Promise<void> => {
  logger.info('Initiating graceful shutdown...');

  server.close(() => {
    logger.info('HTTP server closed');
  });

  io.close(() => {
    logger.info('WebSocket server closed');
  });

  try {
    await pool.end();
    logger.info('Database pool closed');
  } catch (err) {
    logger.error('Error closing database pool', {
      error: (err as Error).message,
      stack: (err as Error).stack,
    });
  }

  if (cacheIsConnected()) {
    try {
      await cacheRedis.quit();
      logger.info('Redis connection closed');
    } catch (err) {
      logger.error('Error closing Redis connection', {
        error: (err as Error).message,
        stack: (err as Error).stack,
      });
    }
  }

  process.exit(0);
};

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught exception', {
    error: err.message,
    stack: err.stack,
  });
  shutdown();
});

process.on('unhandledRejection', (err: unknown) => {
  const error = err instanceof Error ? err : new Error(String(err));
  logger.error('Unhandled rejection', {
    error: error.message,
    stack: error.stack,
  });
  shutdown();
});

export default app;
