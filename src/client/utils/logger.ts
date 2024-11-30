/**
 * @deprecated Use frontendLogger.ts instead. This logger will be removed in a future version.
 * Import from '../utils/frontendLogger' instead of '../utils/logger'.
 */

import { logger as frontendLogger } from './frontendLogger';
import type { LogMetadata } from '../../types/logger';

interface LoggerOptions {
  level: 'debug' | 'info' | 'warn' | 'error';
  prefix?: string;
}

class Logger {
  private level: string;
  private prefix: string;

  constructor(options: LoggerOptions) {
    console.warn('Logger from logger.ts is deprecated. Please use frontendLogger.ts instead.');
    this.level = options.level;
    this.prefix = options.prefix || '';
  }

  private formatMessage(level: string, message: string, data?: unknown): string {
    const meta: LogMetadata = {
      ...(typeof data === 'object' ? data as object : { data }),
      prefix: this.prefix
    };
    return message;
  }

  debug(message: string, data?: unknown): void {
    frontendLogger.debug(this.formatMessage('debug', message, data), data as LogMetadata);
  }

  info(message: string, data?: unknown): void {
    frontendLogger.info(this.formatMessage('info', message, data), data as LogMetadata);
  }

  warn(message: string, data?: unknown): void {
    frontendLogger.warn(this.formatMessage('warn', message, data), data as LogMetadata);
  }

  error(message: string, data?: unknown): void {
    frontendLogger.error(this.formatMessage('error', message, data), data as LogMetadata);
  }
}

export const logger = new Logger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  prefix: 'Client',
});
