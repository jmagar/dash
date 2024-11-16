import { join } from 'path';
import { createLogger, format, transports } from 'winston';
import type { Logger, LogMetadata } from '../../types/logger';
import { config } from '../config';
import { GotifyTransport } from './gotifyTransport';

const logFile = join(process.cwd(), config.logging.file);

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
  }),
];

// Add Gotify transport if configured
const gotifyTransport = config.gotify.url && config.gotify.token
  ? new GotifyTransport({
      url: config.gotify.url,
      token: config.gotify.token,
    })
  : null;

if (gotifyTransport) {
  logTransports.push(gotifyTransport);
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

  critical(message: string, metadata?: LogMetadata & { notify?: boolean }): void {
    // Always log as error level
    this.logger.error(message, {
      ...this.context,
      ...metadata,
      notify: metadata?.notify ?? true, // Default to true for critical messages
      critical: true,
    });
  }

  withContext(context: LogMetadata): Logger {
    const newLogger = new ServerLogger();
    newLogger.context = { ...this.context, ...context };
    return newLogger;
  }
}

export const logger = new ServerLogger();
