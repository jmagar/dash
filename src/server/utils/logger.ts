import { join } from 'path';
import { createLogger, format, transports } from 'winston';
import type { Logger, LogMetadata } from '../../types/logger';
import { config } from '../config';
import { GotifyTransport } from './gotifyTransport';
import os from 'os';

// Use platform-specific log directory
const isWindows = os.platform() === 'win32';
const logDir = isWindows ? 'C:\\ProgramData\\shh\\logs' : '/var/log/shh';
const logFile = join(logDir, 'server.log');

// Ensure log directory exists
import { mkdirSync } from 'fs';
try {
  mkdirSync(logDir, { recursive: true });
} catch (error) {
  console.warn(`Failed to create log directory: ${error}`);
}

// Create transports array
const logTransports = [
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
  }),
];

// Add Gotify transport if configured
if (config.gotify.url && config.gotify.token) {
  logTransports.push(
    new GotifyTransport({
      url: config.gotify.url,
      token: config.gotify.token,
      level: 'error',
    }) as unknown as transports.FileTransportInstance
  );
}

class ServerLogger implements Logger {
  private logger = createLogger({
    level: config.logging.level,
    format: format.combine(
      format.timestamp(),
      format.json()
    ),
    transports: logTransports,
  });

  private context: LogMetadata = {};

  error(message: string, metadata?: LogMetadata): void {
    this.logger.error(message, { ...this.context, ...metadata });
  }

  warn(message: string, metadata?: LogMetadata): void {
    this.logger.warn(message, { ...this.context, ...metadata });
  }

  info(message: string, metadata?: LogMetadata): void {
    this.logger.info(message, { ...this.context, ...metadata });
  }

  debug(message: string, metadata?: LogMetadata): void {
    this.logger.debug(message, { ...this.context, ...metadata });
  }

  setContext(context: LogMetadata): void {
    this.context = context;
  }

  child(options: LogMetadata): Logger {
    const childLogger = new ServerLogger();
    childLogger.setContext({ ...this.context, ...options });
    return childLogger;
  }
}

export const logger = new ServerLogger();

// Add shutdown handler for Windows service
if (isWindows) {
  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM. Performing graceful shutdown...');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.info('Received SIGINT. Performing graceful shutdown...');
    process.exit(0);
  });
}
