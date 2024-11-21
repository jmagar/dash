import { 
  createLogger,
  transports,
  format,
  Logger as WinstonLogger,
  transport as WinstonTransport
} from 'winston';
import 'winston-daily-rotate-file';
import type { Logger, LogMetadata, LogLevel } from '../../types/logger';
import config from '../config';
import { join } from 'path';
import { GotifyTransport } from './gotifyTransport';
import * as os from 'os';
import { mkdirSync } from 'fs';

// Use platform-specific log directory
const isWindows = os.platform() === 'win32';
const logDir = isWindows ? 'C:\\ProgramData\\shh\\logs' : '/var/log/shh';
const logFile = join(logDir, 'app.log');

// Ensure log directory exists
try {
  mkdirSync(logDir, { recursive: true });
} catch (error) {
  console.warn(`Failed to create log directory: ${error}`);
}

// Custom format that includes metadata
const customFormat = format.printf(({ level, message, timestamp, ...metadata }) => {
  const metaString = Object.keys(metadata).length ? JSON.stringify(metadata) : '';
  return `${timestamp} [${level.toUpperCase()}] ${message} ${metaString}`;
});

// Create base transports array with a single rotating file
const logTransports: WinstonTransport[] = [
  new transports.Console({
    format: format.combine(
      format.colorize(),
      format.simple()
    ),
  }),
  new (transports.DailyRotateFile)({
    filename: logFile,
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: format.combine(
      format.timestamp(),
      format.json(),
      customFormat
    ),
    // Compress older logs
    zippedArchive: !isWindows,
    // Keep logs for 14 days
    maxRetentionDays: 14
  })
];

// Add Gotify transport if configured (for critical errors only)
if (config.gotify?.url && config.gotify?.token) {
  logTransports.push(new GotifyTransport({
    level: 'error'
  }));
}

class ServerLogger implements Logger {
  private logger: WinstonLogger;
  private context: Record<string, unknown> = {};

  constructor() {
    this.logger = createLogger({
      level: config.logging?.level || 'info',
      format: format.combine(
        format.timestamp(),
        format.json(),
        customFormat
      ),
      transports: logTransports,
      // Add exception handling
      exceptionHandlers: logTransports,
      // Don't exit on uncaught exceptions
      exitOnError: false
    });

    // Handle uncaught promise rejections
    process.on('unhandledRejection', (reason: unknown) => {
      this.error('Unhandled Promise Rejection', { error: reason });
    });
  }

  private formatMessage(level: LogLevel, message: string, meta?: LogMetadata): any {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...this.context,
      ...(meta || {}),
    };
  }

  debug(message: string, meta?: LogMetadata): void {
    this.logger.debug(this.formatMessage('debug', message, meta));
  }

  info(message: string, meta?: LogMetadata): void {
    this.logger.info(this.formatMessage('info', message, meta));
  }

  warn(message: string, meta?: LogMetadata): void {
    this.logger.warn(this.formatMessage('warn', message, meta));
  }

  error(message: string, meta?: LogMetadata): void {
    this.logger.error(this.formatMessage('error', message, meta));
  }

  critical(message: string, meta?: LogMetadata): void {
    this.logger.error(this.formatMessage('critical', message, {
      ...meta,
      notify: true, // Flag for Gotify transport
      critical: true
    }));
  }

  withContext(context: Record<string, unknown>): Logger {
    const childLogger = new ServerLogger();
    childLogger.context = { ...this.context, ...context };
    return childLogger;
  }

  child(options: LogMetadata): Logger {
    return this.withContext(options);
  }
}

export const logger = new ServerLogger();
