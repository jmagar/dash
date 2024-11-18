import type { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fileUpload from 'express-fileupload';
import { config } from '../config';
import { logger } from '../utils/logger';

// Security headers using Helmet
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", ...config.cors.origin.split(',')],
      fontSrc: ["'self'", 'https:', 'data:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

// CORS configuration
export const corsConfig = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = config.cors.origin.split(',').map(o => o.trim());
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: config.cors.methods,
  allowedHeaders: config.cors.allowedHeaders,
  exposedHeaders: config.cors.exposedHeaders,
  credentials: config.cors.credentials,
  maxAge: config.cors.maxAge,
};

// Rate limiting middleware
export const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler(req: Request, res: Response) {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      headers: req.headers,
    });
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});

// File upload configuration
export const fileUploadConfig = fileUpload({
  limits: {
    fileSize: config.security.maxFileSize,
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
  const contentType = req.headers['content-type'];
  
  // Skip validation for GET and HEAD requests
  if (['GET', 'HEAD'].includes(req.method)) {
    return next();
  }

  // Require content-type header for requests with body
  if (req.method !== 'GET' && !contentType) {
    logger.warn('Missing content-type header', {
      method: req.method,
      path: req.path,
    });
    res.status(400).json({
      error: 'Content-Type header is required',
    });
    return;
  }

  // Allow multipart/form-data for file uploads
  if (req.is('multipart/form-data')) {
    return next();
  }

  // Validate JSON content type
  if (!req.is('application/json')) {
    logger.warn('Invalid content type', {
      contentType,
      method: req.method,
      path: req.path,
    });
    res.status(415).json({
      error: 'Content type must be application/json',
    });
    return;
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
  securityHeaders,
  corsConfig,
  rateLimiter,
  fileUploadConfig,
  validateContentType,
  validateRequestSize,
];
