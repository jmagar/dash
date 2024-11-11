import path from 'path';
import { createLogger, format, transports, Logger as WinstonLogger } from 'winston';

import type { Logger, LogConfig } from '../../types/logging';

const { combine, timestamp, printf, colorize } = format;

const defaultConfig: LogConfig = {
  level: 'info',
  format: 'text',
  timestamp: true,
  colors: true,
};

class ServerLogger implements Logger {
  private logger: WinstonLogger;

  constructor(config: Partial<LogConfig> = {}) {
    const finalConfig = { ...defaultConfig, ...config };

    const logFormat = printf(({ level, message, timestamp, ...meta }) => {
      const metaString = Object.keys(meta).length
        ? ` ${JSON.stringify(meta)}`
        : '';
      return `${timestamp} [${level}]: ${message}${metaString}`;
    });

    // Create logs directory path
    const logsDir = path.join(__dirname, '../../../logs');

    this.logger = createLogger({
      level: finalConfig.level,
      format: combine(
        timestamp(),
        finalConfig.colors ? colorize() : format.simple(),
        logFormat,
      ),
      transports: [
        // Console transport
        new transports.Console(),
        // File transports
        new transports.File({
          filename: path.join(logsDir, 'error.log'),
          level: 'error',
        }),
        new transports.File({
          filename: path.join(logsDir, 'combined.log'),
        }),
        // Daily rotate file transport for detailed logs
        new transports.File({
          filename: path.join(logsDir, `detailed-${new Date().toISOString().split('T')[0]}.log`),
          format: combine(
            timestamp(),
            format.json()
          ),
        }),
      ],
    });
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.logger.info(message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.logger.warn(message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.logger.error(message, meta);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.logger.debug(message, meta);
  }
}

export const serverLogger = new ServerLogger();
