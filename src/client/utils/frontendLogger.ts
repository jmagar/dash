import type { Logger, LogLevel, LogMetadata } from '@/types/logging';

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

  private formatMessage(level: LogLevel, message: string, meta?: LogMetadata): string {
    const timestamp = new Date().toISOString();
    const formattedMeta = meta ? this.formatMeta(meta) : '';
    return `${timestamp} ${this.prefix} [${level.toUpperCase()}] ${message}${formattedMeta}`;
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

  debug(message: string, meta?: LogMetadata): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }

  info(message: string, meta?: LogMetadata): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, meta));
    }
  }

  warn(message: string, meta?: LogMetadata): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, meta));
    }
  }

  error(message: string, meta?: LogMetadata): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, meta));
    }
  }

  critical(message: string, meta?: LogMetadata): void {
    if (this.shouldLog('critical')) {
      console.error(this.formatMessage('critical', message, meta));
    }
  }
}

export const logger = new FrontendLogger(
  (process.env.REACT_APP_LOG_LEVEL as LogLevel) || 'info'
);
