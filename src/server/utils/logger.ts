import { 
  createLogger,
  transports,
  format,
  Logger as WinstonLogger,
  transport as WinstonTransport
} from 'winston';
import 'winston-daily-rotate-file';
import type { Logger, LogMetadata, LogLevel } from '../../types/logger';
import type { 
  FileTransportOptions, 
  ConsoleTransportOptions,
  DEFAULT_FILE_TRANSPORT_CONFIG,
  DEFAULT_CONSOLE_CONFIG,
  TransportError
} from '../../types/transports';
import type {
  FormatWrap,
  FormatOptions,
  FormatMetadata,
  DEFAULT_FORMAT_CONFIG
} from '../../types/formats';
import config from '../config';
import { join } from 'path';
import { mkdirSync } from 'fs';
import { GotifyTransport } from './gotifyTransport';
import * as os from 'os';

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
const customFormat = format.printf(({ level, message, timestamp, ...metadata }: FormatMetadata) => {
  const metaString = Object.keys(metadata).length ? JSON.stringify(metadata) : '';
  return `${timestamp} [${level.toUpperCase()}] ${message} ${metaString}`;
}) as FormatWrap;

// Create base transports array with console and file rotation
const logTransports: WinstonTransport[] = [
  new transports.Console({
    ...DEFAULT_CONSOLE_CONFIG,
    format: format.combine(
      format.colorize(DEFAULT_FORMAT_CONFIG.colorize),
      format.simple()
    ) as FormatWrap,
  } as ConsoleTransportOptions),
  new transports.DailyRotateFile({
    filename: logFile,
    ...DEFAULT_FILE_TRANSPORT_CONFIG,
    format: format.combine(
      format.timestamp(DEFAULT_FORMAT_CONFIG),
      format.json()
    ) as FormatWrap,
  } as FileTransportOptions)
];

// Add Gotify transport if configured
if (config.gotify?.url && config.gotify?.token) {
  logTransports.push(new GotifyTransport({
    level: 'error',
    handleExceptions: true,
    handleRejections: true
  }));
}

class ServerLogger implements Logger {
  private logger: WinstonLogger;
  private context: Record<string, unknown> = {};

  constructor() {
    this.logger = createLogger({
      level: config.logging?.level || 'info',
      format: format.combine(
        format.timestamp(DEFAULT_FORMAT_CONFIG),
        format.json(),
        customFormat
      ) as FormatWrap,
      transports: logTransports,
      // Add exception handling
      exceptionHandlers: logTransports,
      // Don't exit on uncaught exceptions
      exitOnError: false
    });

    // Handle uncaught promise rejections
    process.on('unhandledRejection', (reason: Error | unknown) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      this.error('Unhandled Promise Rejection', { error: error.message, stack: error.stack });
    });
  }

  private formatMessage(level: LogLevel, message: string, meta?: LogMetadata): Record<string, unknown> {
    return {
      level,
      message,
      ...this.context,
      ...(meta || {}),
      timestamp: new Date().toISOString()
    };
  }

  debug(message: string, meta?: LogMetadata): void {
    this.logger.debug(message, this.formatMessage('debug', message, meta));
  }

  info(message: string, meta?: LogMetadata): void {
    this.logger.info(message, this.formatMessage('info', message, meta));
  }

  warn(message: string, meta?: LogMetadata): void {
    this.logger.warn(message, this.formatMessage('warn', message, meta));
  }

  error(message: string, meta?: LogMetadata): void {
    this.logger.error(message, this.formatMessage('error', message, meta));
  }

  critical(message: string, meta?: LogMetadata): void {
    this.logger.error(message, this.formatMessage('critical', message, meta));
  }

  withContext(context: Record<string, unknown>): Logger {
    const child = new ServerLogger();
    child.context = { ...this.context, ...context };
    return child;
  }

  child(options: LogMetadata): Logger {
    return this.withContext(options);
  }
}

export const logger = new ServerLogger();
