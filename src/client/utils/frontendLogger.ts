import type { Logger, LogLevel, LogMetadata } from '../../types/logging';

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
      console.debug(this.formatMessage('debug', message, data));
    }
  }

  info(message: string, data?: unknown): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, data));
    }
  }

  warn(message: string, data?: unknown): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, data));
    }
  }

  error(message: string, data?: unknown): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, data));
    }
  }

  critical(message: string, data?: unknown): void {
    if (this.shouldLog('critical')) {
      console.error(this.formatMessage('critical', message, data));
    }
  }
}

// Create and export the default logger instance
export const logger = new FrontendLogger(
  (process.env.REACT_APP_LOG_LEVEL as LogLevel) || 'info'
);
