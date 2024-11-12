import fs from 'fs';
import http from 'http';
import os from 'os';
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
  redis,
  initializeCache,
} from './cache';
import { pool, initializeDatabase } from './db';
import { requestLogger } from './middleware/requestLogger';
import routes from './routes';
import { initializeSocketIO } from './routes/terminal';
import { serverLogger as logger } from './utils/serverLogger';

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Import socket.io using require since it has issues with ES modules
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Server: SocketServer } = require('socket.io');

// Create express app
const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Parse JSON bodies
app.use(expressJson());

// Request logging middleware
app.use(requestLogger);

// Mount API routes
app.use('/api', routes);

// Serve static files from the React build directory
const buildPath = path.resolve(__dirname, '../../build');
if (fs.existsSync(buildPath)) {
  app.use(expressStatic(buildPath, {
    etag: true,
    lastModified: true,
    setHeaders: (res: Response) => {
      res.set('Cache-Control', 'no-cache');
    },
  }));
}

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
    credentials: true,
  },
});

// Initialize WebSocket handlers
initializeSocketIO(io);

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

// Serve React app for all other routes
app.get('*', (_req: Request, res: Response) => {
  try {
    const indexPath = path.resolve(buildPath, 'index.html');
    if (!fs.existsSync(indexPath)) {
      throw new Error('index.html not found');
    }

    // Read and send the file directly instead of using sendFile
    const indexHtml = fs.readFileSync(indexPath, 'utf8');
    res.set('Cache-Control', 'no-cache');
    res.set('Content-Type', 'text/html');
    res.send(indexHtml);
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

// Get server IP addresses
const getServerIPs = (): string[] => {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];

  Object.values(interfaces).forEach((iface) => {
    if (iface) {
      iface.forEach((addr) => {
        if (addr.family === 'IPv4' && !addr.internal) {
          addresses.push(addr.address);
        }
      });
    }
  });

  return addresses;
};

// Initialize server
const startServer = async (): Promise<void> => {
  try {
    // Initialize database first
    await initializeDatabase();
    logger.info('Database initialized successfully');

    // Initialize Redis (non-blocking)
    void initializeCache().then(() => {
      logger.info('Redis initialization completed');
    });

    // Start HTTP server
    const PORT = process.env.PORT || 4000;
    const portNumber = typeof PORT === 'string' ? parseInt(PORT, 10) : PORT;

    server.listen(portNumber, '0.0.0.0', () => {
      const ips = getServerIPs();
      const addresses = ips.map(ip => `http://${ip}:${portNumber}`);

      logger.info('Server started', {
        environment: process.env.NODE_ENV,
        port: portNumber,
        addresses,
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4000',
        dbHost: process.env.DB_HOST,
        redisHost: process.env.REDIS_HOST,
      });

      // Log server addresses for visibility
      logger.info('Server is running on:', {
        addresses,
      });
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    process.exit(1);
  }
};

// Graceful shutdown handling
let isShuttingDown = false;

const shutdown = async (): Promise<void> => {
  if (isShuttingDown) {
    logger.info('Shutdown already in progress...');
    return;
  }

  isShuttingDown = true;
  logger.info('Initiating graceful shutdown...');

  // Create a promise for server close
  const serverClosePromise = new Promise<void>((resolve) => {
    server.close(() => {
      logger.info('HTTP server closed');
      resolve();
    });
  });

  // Create a promise for WebSocket close
  const wsClosePromise = new Promise<void>((resolve) => {
    io.close(() => {
      logger.info('WebSocket server closed');
      resolve();
    });
  });

  try {
    // Wait for all connections to close
    await Promise.all([serverClosePromise, wsClosePromise]);

    // Close database pool
    if (pool) {
      await pool.end();
      logger.info('Database pool closed');
    }

    // Close Redis connection if available
    if (cacheIsConnected()) {
      const redisClient = await redis.getClient();
      if (redisClient) {
        await redisClient.quit();
        logger.info('Redis connection closed');
      }
    }

    // Exit process
    process.exit(0);
  } catch (err) {
    logger.error('Error during shutdown', {
      error: (err as Error).message,
      stack: (err as Error).stack,
    });
    process.exit(1);
  }
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

// Start server
void startServer();

export default app;
