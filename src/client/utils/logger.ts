import { LoggingManager } from '../../server/utils/logging/LoggingManager';
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
    consoleLoggingManager.getInstance().();
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
    frontendLoggerLoggingManager.getInstance().(), data as LogMetadata);
  }

  info(message: string, data?: unknown): void {
    frontendLoggerLoggingManager.getInstance().(), data as LogMetadata);
  }

  warn(message: string, data?: unknown): void {
    frontendLoggerLoggingManager.getInstance().(), data as LogMetadata);
  }

  error(message: string, data?: unknown): void {
    frontendLoggerLoggingManager.getInstance().(), data as LogMetadata);
  }
}

export const logger = new Logger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  prefix: 'Client',
});


