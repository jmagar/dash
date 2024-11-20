import { 
  createLogger,
  transports,
  format,
  Logger as WinstonLogger,
  transport as WinstonTransport
} from 'winston';
import type { Logger, LogMetadata, LogLevel } from '../../types/logger';
import config from '../config';
import { join } from 'path';
import { GotifyTransport } from './gotifyTransport';
import * as os from 'os';
import { mkdirSync } from 'fs';

// Use platform-specific log directory
const isWindows = os.platform() === 'win32';
const logDir = isWindows ? 'C:\\ProgramData\\shh\\logs' : '/var/log/shh';
const logFile = join(logDir, 'server.log');

// Ensure log directory exists
try {
  mkdirSync(logDir, { recursive: true });
} catch (error) {
  console.warn(`Failed to create log directory: ${error}`);
}

// Create base transports array
const logTransports: WinstonTransport[] = [
  new transports.Console({
    format: format.combine(
      format.colorize(),
      format.simple()
    ),
  }),
  new transports.File({
    filename: logFile,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    tailable: true,
    zippedArchive: !isWindows, // Only use zipped archives on Unix systems
  })
];

// Add Gotify transport if configured
if (config.gotify?.url && config.gotify?.token) {
  logTransports.push(new GotifyTransport({
    level: 'error'
  }));
}

class ServerLogger implements Logger {
  private logger: WinstonLogger;

  constructor() {
    this.logger = createLogger({
      level: config.logging?.level || 'info',
      format: format.combine(
        format.timestamp(),
        format.json()
      ),
      transports: logTransports,
    });
  }

  private formatMessage(level: LogLevel, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const formattedData = data ? this.formatData(data) : '';
    return `${timestamp} ${message}${formattedData}`;
  }

  private formatData(data: unknown): string {
    if (!data) return '';
    
    if (data instanceof Error) {
      return ` Error: ${data.message}`;
    }

    if (typeof data === 'object') {
      try {
        return ` ${JSON.stringify(data)}`;
      } catch {
        return ` [Object]`;
      }
    }

    return ` ${String(data)}`;
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
    this.logger.error(this.formatMessage('critical', message, meta));
  }

  withContext(context: Record<string, unknown>): Logger {
    const childLogger = new ServerLogger();
    childLogger.logger = this.logger.child(context);
    return childLogger;
  }

  setContext(_context: LogMetadata): void {
    // No-op, context is now handled by withContext
  }

  child(options: LogMetadata): Logger {
    return this.withContext(options);
  }
}

export const logger = new ServerLogger();
