import type { Logger, LogLevel, LogMetadata } from '../../types/logging';
import { LoggingManager } from '../../server/utils/logging/LoggingManager';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  critical: 4,
};

export class FrontendLogger implements Logger {
  private readonly level: LogLevel;
  private readonly prefix: string;

  constructor(level: LogLevel = 'info', prefix = '[Frontend]') {
    this.level = level;
    this.prefix = prefix;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private formatMessage(level: LogLevel, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const meta = this.convertToMeta(data);
    const formattedMeta = meta ? this.formatMeta(meta) : '';
    return `${timestamp} ${this.prefix} [${level.toUpperCase()}] ${message}${formattedMeta}`;
  }

  private convertToMeta(data?: unknown): LogMetadata | undefined {
    if (data === undefined || data === null) {
      return undefined;
    }

    // If it's already a LogMetadata object, use it directly
    if (typeof data === 'object' && !Array.isArray(data) && data !== null) {
      return data as LogMetadata;
    }

    // Otherwise wrap it in a data field
    return { data };
  }

  private formatMeta(meta: LogMetadata): string {
    if (!meta || Object.keys(meta).length === 0) {
      return '';
    }

    const formattedMeta = Object.entries(meta)
      .map(([key, value]) => {
        if (value instanceof Error) {
          return `${key}=${value.message}`;
        }
        if (typeof value === 'object') {
          return `${key}=${JSON.stringify(value)}`;
        }
        return `${key}=${String(value)}`;
      })
      .join(' ');

    return ` ${formattedMeta}`;
  }

  debug(message: string, data?: unknown): void {
    if (this.shouldLog('debug')) {
      consoleLoggingManager.getInstance().());
    }
  }

  info(message: string, data?: unknown): void {
    if (this.shouldLog('info')) {
      consoleLoggingManager.getInstance().());
    }
  }

  warn(message: string, data?: unknown): void {
    if (this.shouldLog('warn')) {
      consoleLoggingManager.getInstance().());
    }
  }

  error(message: string, data?: unknown): void {
    if (this.shouldLog('error')) {
      consoleLoggingManager.getInstance().());
    }
  }

  critical(message: string, data?: unknown): void {
    if (this.shouldLog('critical')) {
      consoleLoggingManager.getInstance().());
    }
  }
}

// Create and export the default logger instance
export const frontendLogger = new FrontendLogger(
  (process.env.REACT_APP_LOG_LEVEL as LogLevel) || 'info'
);

// Also export the instance as 'logger' for backward compatibility
export 

