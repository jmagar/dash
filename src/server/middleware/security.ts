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
      connectSrc: ["'self'", ...config.cors.origin],
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
    if (!origin || config.cors.origin.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: config.security.allowedMethods,
  allowedHeaders: config.security.allowedHeaders,
  exposedHeaders: config.security.exposedHeaders,
  credentials: config.security.credentials,
  maxAge: config.security.maxAge,
};

// Rate limiting middleware
export const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests, please try again later.',
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      requestId: req.requestId,
      userId: req.user?.id,
    });
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later.',
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
  debug: process.env.NODE_ENV === 'development',
  safeFileNames: true,
  preserveExtension: true,
  createParentPath: true,
});

/**
 * Content type validation middleware
 * Ensures requests have appropriate content type headers
 */
export function validateContentType(req: Request, res: Response, next: NextFunction): void {
  const contentType = req.headers['content-type'];
  const acceptedTypes = ['application/json', 'multipart/form-data'];

  if (req.method !== 'GET' && !contentType) {
    res.status(400).json({
      success: false,
      error: 'Content-Type header is required',
    });
    return;
  }

  if (contentType && !acceptedTypes.some(type => contentType.includes(type))) {
    res.status(415).json({
      success: false,
      error: `Unsupported Content-Type. Accepted types: ${acceptedTypes.join(', ')}`,
    });
    return;
  }

  next();
}

/**
 * Request size validation middleware
 * Ensures requests don't exceed configured size limits
 */
export function validateRequestSize(req: Request, res: Response, next: NextFunction): void {
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);

  if (contentLength > config.server.maxRequestSize) {
    res.status(413).json({
      success: false,
      error: 'Request entity too large',
    });
    return;
  }

  next();
}

// Combine all security middleware
export const security = [
  securityHeaders,
  rateLimiter,
  validateContentType,
  validateRequestSize,
  fileUploadConfig,
];
