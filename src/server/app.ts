import express, { json, urlencoded } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { LoggingManager } from './utils/logging/LoggingManager';
import { errorHandler, notFoundHandler } from './middleware/error';
import { requestLogger, slowRequestLogger } from './middleware/logging';
import { apiLimiter } from './middleware/rateLimit';
import routes from './routes';
import { monitoringService } from './services/monitoring';
import { Server } from 'http';

// Initialize express app
const app = express();
let server: Server | null = null;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' }
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  maxAge: 600
}));

// Request parsing
app.use(json({ limit: '10mb' }));
app.use(urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging middleware
app.use(requestLogger);
app.use(slowRequestLogger(1000)); // Log requests slower than 1 second

// Rate limiting
app.use(apiLimiter);

// Routes
app.use('/api', routes);

// 404 handler - must come after routes
app.use(notFoundHandler);

// Error handling - must be last
app.use(errorHandler);

// Unhandled rejection handler
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  LoggingManager.getInstance().error('Unhandled Rejection at:', {
    promise,
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined
  });
});

// Uncaught exception handler
process.on('uncaughtException', (error: Error) => {
  LoggingManager.getInstance().error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack
  });
  
  // Perform graceful shutdown
  setTimeout(() => {
    LoggingManager.getInstance().info('Shutting down due to uncaught exception');
    process.exit(1);
  }, 1000);
});

// Graceful shutdown handler
process.on('SIGTERM', () => {
  LoggingManager.getInstance().info('SIGTERM received. Performing graceful shutdown...');
  
  // Stop monitoring
  void monitoringService.stopMonitoring();
  
  // Close server
  if (server) {
    server.close(() => {
      LoggingManager.getInstance().info('Server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

// Start server
const PORT = process.env.PORT || 3000;
server = app.listen(PORT, () => {
  LoggingManager.getInstance().info(`Server started on port ${PORT}`);
  
  // Start monitoring service
  void monitoringService.startMonitoring();
  
  // Register core services for monitoring
  void monitoringService.registerService('database');
  void monitoringService.registerService('cache');
  void monitoringService.registerService('api');
});

export { app, server };

