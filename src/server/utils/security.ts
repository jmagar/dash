import * as path from 'path';
import { BadRequestException } from '@nestjs/common';
import { logger } from '../../logger';
import { LoggingManager } from '../../../../../../../../../utils/logging/LoggingManager';

export interface FileValidationOptions {
  maxSize?: number;
  allowedExtensions?: string[];
  allowedMimeTypes?: string[];
}

const defaultOptions: FileValidationOptions = {
  maxSize: 100 * 1024 * 1024, // 100MB
  allowedExtensions: undefined, // Allow all
  allowedMimeTypes: undefined, // Allow all
};

/**
 * Sanitizes a file path to prevent path traversal attacks
 * @param filePath The path to sanitize
 * @returns The sanitized path
 * @throws BadRequestException if the path is invalid
 */
export function sanitizePath(filePath: string): string {
  try {
    // Normalize the path to resolve .. and . segments
    const normalizedPath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
    
    // Ensure the path doesn't try to traverse up
    if (normalizedPath.includes('../') || normalizedPath.includes('..\\')) {
      throw new BadRequestException('Invalid path: Path traversal detected');
    }

    // Remove any leading slashes to make the path relative
    return normalizedPath.replace(/^[\/\\]+/, '');
  } catch (error) {
    loggerLoggingManager.getInstance().();
    throw new BadRequestException('Invalid path');
  }
}

/**
 * Validates a file against size and type restrictions
 * @param file The file to validate
 * @param options Validation options
 * @throws BadRequestException if the file is invalid
 */
export function validateFile(
  file: Express.Multer.File,
  options: FileValidationOptions = defaultOptions
): void {
  // Check file size
  if (options.maxSize && file.size > options.maxSize) {
    throw new BadRequestException(
      `File too large. Maximum size is ${options.maxSize} bytes`
    );
  }

  // Check file extension
  if (options.allowedExtensions?.length) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!options.allowedExtensions.includes(ext)) {
      throw new BadRequestException(
        `Invalid file extension. Allowed extensions: ${options.allowedExtensions.join(
          ', '
        )}`
      );
    }
  }

  // Check MIME type
  if (options.allowedMimeTypes?.length) {
    if (!options.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${options.allowedMimeTypes.join(', ')}`
      );
    }
  }
}

/**
 * Rate limiting configuration
 */
export const rateLimitConfig = {
  ttl: 60, // 1 minute
  limit: 100, // 100 requests per minute
};

/**
 * Security headers configuration
 */
export const securityHeaders = {
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'",
};

