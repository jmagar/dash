import winston from 'winston';

import type { Logger, LogConfig } from '../../types/logging';

const { createLogger, format, transports } = winston;
const { combine, timestamp, printf, colorize } = format;

const defaultConfig: LogConfig = {
  level: 'info',
  format: 'text',
  timestamp: true,
  colors: true,
};

class ServerLogger implements Logger {
  private logger: winston.Logger;

  constructor(config: Partial<LogConfig> = {}) {
    const finalConfig = { ...defaultConfig, ...config };

    const logFormat = printf(({ level, message, timestamp, ...meta }) => {
      const metaString = Object.keys(meta).length
        ? ` ${JSON.stringify(meta)}`
        : '';
      return `${timestamp} [${level}]: ${message}${metaString}`;
    });

    this.logger = createLogger({
      level: finalConfig.level,
      format: combine(
        timestamp(),
        finalConfig.colors ? colorize() : format.simple(),
        logFormat,
      ),
      transports: [new transports.Console()],
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
