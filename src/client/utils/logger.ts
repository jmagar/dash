import { logger as frontendLogger } from './frontendLogger';
import type { LogMetadata } from '../../types/logger';

interface LoggerOptions {
  level: 'debug' | 'info' | 'warn' | 'error';
  prefix?: string;
}

class Logger {
  private level: LogLevel;
  private prefix: string;

  constructor(options: LoggerOptions) {
    this.level = options.level;
    this.prefix = options.prefix || '';
  }

  private formatMessage(level: string, message: string, data?: unknown): string {
    const meta: LogMetadata = {
      ...(typeof data === 'object' ? data as object : { data }),
      prefix: this.prefix
    };
    return `${this.prefix ? `[${this.prefix}] ` : ''}${message}`;
  }

  debug(message: string, data?: unknown): void {
    frontendLogger.debug(this.formatMessage('debug', message), data as LogMetadata);
  }

  info(message: string, data?: unknown): void {
    frontendLogger.info(this.formatMessage('info', message), data as LogMetadata);
  }

  warn(message: string, data?: unknown): void {
    frontendLogger.warn(this.formatMessage('warn', message), data as LogMetadata);
  }

  error(message: string, data?: unknown): void {
    frontendLogger.error(this.formatMessage('error', message), data as LogMetadata);
  }
}

export const logger = new Logger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  prefix: 'Client',
});
