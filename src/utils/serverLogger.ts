import { createLogger, format, transports } from 'winston';
import 'winston-daily-rotate-file';

const { combine, timestamp, printf, colorize } = format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}] ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

// Create the logger
const serverLogger = createLogger({
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat,
  ),
  transports: [
    // Console transport
    new transports.Console({
      format: combine(
        colorize(),
        logFormat,
      ),
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    }),
    // Rotating file transport for errors
    new transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '14d',
      maxSize: '20m',
    }),
    // Rotating file transport for all logs
    new transports.DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      maxSize: '20m',
    }),
  ],
});

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
