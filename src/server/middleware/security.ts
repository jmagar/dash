import type { Request, Response, NextFunction } from 'express';
import fileUpload from 'express-fileupload';
import rateLimit, { type Options as RateLimitOptions } from 'express-rate-limit';

import { createApiError } from '../../types/error';
import type { LogMetadata } from '../../types/logger';
import { logger } from '../utils/logger';

// Parse rate limit window from environment variable (default: 15 minutes)
const rateLimitWindow = parseInt(process.env.RATE_LIMIT_WINDOW || '15', 10) * 60 * 1000;
const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);

// Rate limiting configuration
const rateLimitOptions: Partial<RateLimitOptions> = {
  windowMs: rateLimitWindow,
  max: maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userAgent: req.headers['user-agent'],
    });
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later.',
    });
  },
};

// Rate limiting middleware
export const rateLimiter = rateLimit(rateLimitOptions);

// File upload middleware configuration
export const fileUploadMiddleware = fileUpload({
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '1048576', 10), // Default 1MB
  },
  abortOnLimit: true,
  useTempFiles: true,
  tempFileDir: '/tmp/',
  debug: process.env.NODE_ENV === 'development',
  safeFileNames: true,
  preserveExtension: true,
  createParentPath: true,
});

// Validate Content-Type middleware
export function validateContentType(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      const error = createApiError('Content-Type must be application/json', 415);
      logger.warn('Invalid Content-Type', {
        contentType,
        path: req.path,
        method: req.method,
      });
      res.status(415).json({
        success: false,
        error: error.message,
      });
      return;
    }
  }
  next();
}

// Validate request size middleware
export function validateRequestSize(req: Request, res: Response, next: NextFunction): void {
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  const maxSize = parseInt(process.env.MAX_REQUEST_SIZE || '1048576', 10); // Default 1MB

  if (contentLength > maxSize) {
    const error = createApiError('Request entity too large', 413);
    logger.warn('Request too large', {
      size: contentLength,
      maxSize,
      path: req.path,
      method: req.method,
    });
    res.status(413).json({
      success: false,
      error: error.message,
    });
    return;
  }
  next();
}

// Security headers middleware
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS filter
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Disable caching for sensitive routes
  const sensitivePaths = ['/api/auth', '/api/users'];
  if (sensitivePaths.some(path => req.path.startsWith(path))) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
}

interface FileUploadRequest extends Request {
  files?: fileUpload.FileArray;
}

// Validate file upload middleware
export function validateFileUpload(req: FileUploadRequest, res: Response, next: NextFunction): void {
  if (!req.path.startsWith('/api/files/upload')) {
    return next();
  }

  const allowedExtensions = (process.env.ALLOWED_UPLOAD_EXTENSIONS || '.txt,.md,.json,.yml,.yaml')
    .split(',')
    .map(ext => ext.trim().toLowerCase());

  const file = req.files?.file;
  if (!file) {
    const error = createApiError('No file uploaded', 400);
    logger.warn('File upload failed: No file provided', { path: req.path });
    res.status(400).json({
      success: false,
      error: error.message,
    });
    return;
  }

  const uploadedFile = Array.isArray(file) ? file[0] : file;
  const fileExtension = uploadedFile.name
    .substring(uploadedFile.name.lastIndexOf('.'))
    .toLowerCase();

  if (!allowedExtensions.includes(fileExtension)) {
    const error = createApiError('File type not allowed', 415);
    logger.warn('File upload failed: Invalid file type', {
      extension: fileExtension,
      allowedExtensions,
      path: req.path,
    });
    res.status(415).json({
      success: false,
      error: error.message,
    });
    return;
  }

  next();
}

// Sanitize request parameters middleware
export function sanitizeParams(req: Request, _res: Response, next: NextFunction): void {
  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = (req.query[key] as string).replace(/[<>]/g, '');
      }
    });
  }

  // Sanitize body parameters
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].replace(/[<>]/g, '');
      }
    });
  }

  next();
}

// Combine all security middleware
export const security = [
  rateLimiter,
  fileUploadMiddleware,
  validateContentType,
  validateRequestSize,
  securityHeaders,
  validateFileUpload,
  sanitizeParams,
];
