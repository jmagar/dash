import type { Request, Response, NextFunction, RequestHandler, ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fileUpload from 'express-fileupload';
import { logger } from '../utils/logger';
import config from '../config';

// Security headers middleware
export const securityHeaders: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  );
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  next();
};

// CORS configuration
export const corsConfig = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = config.server.cors.origin.split(',').map((o: string) => o.trim());
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: config.server.cors.methods,
  allowedHeaders: config.server.cors.allowedHeaders.split(','),
  exposedHeaders: config.server.cors.exposedHeaders.split(',').filter(Boolean),
  credentials: config.server.cors.credentials,
  maxAge: config.server.cors.maxAge,
};

// Request tracing middleware
export const requestTracer: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);

  // Log request
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
  });

  // Log response on finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
    });
  });

  next();
};

// Error handling middleware
export const errorHandler: ErrorRequestHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
};

interface FileUploadError extends Error {
  code?: string;
}

// File upload error handler
export const fileUploadErrorHandler: ErrorRequestHandler = (err: FileUploadError, req: Request, res: Response, next: NextFunction) => {
  if (err?.code === 'LIMIT_FILE_SIZE') {
    logger.warn('File size limit exceeded:', {
      error: err.message,
      path: req.path,
    });
    
    res.status(413).json({
      success: false,
      error: 'File too large'
    });
    return;
  }
  
  if (err?.code === 'LIMIT_UNEXPECTED_FILE') {
    logger.warn('Unexpected file upload:', {
      error: err.message,
      path: req.path,
    });
    
    res.status(415).json({
      error: 'Unsupported file type'
    });
    return;
  }
  
  next(err);
};

// Not found handler
export const notFoundHandler: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  logger.warn('Route not found:', {
    path: req.path,
    method: req.method,
  });

  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
};

// Rate limiting middleware handler
export const rateLimitHandler: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  logger.warn('Rate limit exceeded:', {
    ip: req.ip,
    path: req.path,
  });

  res.status(429).json({
    success: false,
    error: 'Too many requests, please try again later.',
  });
};

// Rate limiting middleware
export const rateLimiter = rateLimit({
  windowMs: config.server.rateLimit.windowMs,
  max: config.server.rateLimit.max,
  message: { success: false, error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// File upload configuration
export const fileUploadConfig = fileUpload({
  limits: {
    fileSize: config.server.security.maxFileSize,
  },
  abortOnLimit: true,
  useTempFiles: true,
  tempFileDir: '/tmp/',
  debug: config.server.env === 'development',
  safeFileNames: true,
  preserveExtension: true,
});

// Content type validation middleware
export function validateContentType(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      res.status(415).json({
        error: 'Unsupported Media Type',
        message: 'Content-Type must be application/json',
      });
      return;
    }
  }
  next();
}

// Request size validation middleware
export function validateRequestSize(req: Request, res: Response, next: NextFunction): void {
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  
  if (contentLength > config.server.maxRequestSize) {
    logger.warn('Request too large', {
      size: contentLength,
      maxSize: config.server.maxRequestSize,
      path: req.path,
    });
    res.status(413).json({
      error: 'Request entity too large',
      maxSize: config.server.maxRequestSize,
    });
    return;
  }

  next();
}

// Combine all security middleware
export const security = [
  helmet(),
  corsConfig,
  rateLimiter,
  fileUploadConfig,
  validateContentType,
  validateRequestSize,
  requestTracer,
  fileUploadErrorHandler,
  errorHandler,
  notFoundHandler,
];
