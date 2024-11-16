import winston from 'winston';
import 'winston-daily-rotate-file';

import type { LogMetadata } from '../types/logger';
import { config } from '../server/config';

const { format } = winston;

const logFormat = format.printf(({ level, message, timestamp, ...metadata }) => {
  const metaString = Object.keys(metadata).length
    ? JSON.stringify(metadata, null, 2)
    : '';

  return `${timestamp} [${level.toUpperCase()}]: ${message}${
    metaString ? `\n${metaString}` : ''
  }`;
});

const serverLogger = winston.createLogger({
  level: config.logging.level || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'shh-server' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: format.combine(
        format.colorize(),
        format.timestamp(),
        logFormat
      ),
    }),

    // Error log file
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'error',
    }),

    // Combined log file
    new winston.transports.DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
});

// Add request context to logs
export const withContext = (metadata: LogMetadata) => {
  return {
    info: (message: string, meta: LogMetadata = {}) =>
      serverLogger.info(message, { ...metadata, ...meta }),
    warn: (message: string, meta: LogMetadata = {}) =>
      serverLogger.warn(message, { ...metadata, ...meta }),
    error: (message: string, meta: LogMetadata = {}) =>
      serverLogger.error(message, { ...metadata, ...meta }),
    debug: (message: string, meta: LogMetadata = {}) =>
      serverLogger.debug(message, { ...metadata, ...meta }),
  };
};

// Add shutdown handler
process.on('SIGTERM', () => {
  serverLogger.info('Received SIGTERM. Performing graceful shutdown...');
  process.exit(0);
});

process.on('SIGINT', () => {
  serverLogger.info('Received SIGINT. Performing graceful shutdown...');
  process.exit(0);
});

export { serverLogger };
