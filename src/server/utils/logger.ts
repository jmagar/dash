import { join } from 'path';
import { createLogger, format, transports } from 'winston';
import type { Logger, LogMetadata } from '../../types/logger';
import { config } from '../config';

const logFile = join(process.cwd(), config.logging.file);

class ServerLogger implements Logger {
  private logger = createLogger({
    level: config.logging.level,
    format: format.combine(
      format.timestamp(),
      format.json()
    ),
    transports: [
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
    ],
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

  withContext(context: LogMetadata): Logger {
    const newLogger = new ServerLogger();
    newLogger.context = { ...this.context, ...context };
    return newLogger;
  }
}

export const logger = new ServerLogger();
