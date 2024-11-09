'use strict';

const path = require('path');

const winston = require('winston');
require('winston-daily-rotate-file');

// Custom format for pretty printing objects
const prettyJson = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  const metaString = Object.keys(meta).length ?
    `\n${JSON.stringify(meta, null, 2)}` :
    '';

  return `${timestamp} ${level}: ${message}${metaString}`;
});

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
);

// Console format with colors
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  prettyJson,
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Write all logs with level 'info' and below to combined.log
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/combined.log'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
    // Console transport with pretty formatting
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/exceptions.log'),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/rejections.log'),
    }),
  ],
});

// Add daily rotate file for application logs in production
if (process.env.NODE_ENV === 'production') {
  const dailyRotateFile = new winston.transports.DailyRotateFile({
    filename: path.join(__dirname, '../logs/application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
    ),
  });

  logger.add(dailyRotateFile);
}

// Add stream for Morgan middleware
logger.stream = {
  write: (message) => logger.info(message.trim()),
};

// Export logger methods with metadata support
module.exports = {
  error: (message, meta = {}) => logger.error(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  info: (message, meta = {}) => logger.info(message, meta),
  http: (message, meta = {}) => logger.http(message, meta),
  debug: (message, meta = {}) => logger.debug(message, meta),
  stream: logger.stream,

  // Helper method for HTTP request logging
  httpRequest: (req, res, duration) => {
    const meta = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent'),
      contentLength: res.get('content-length'),
    };

    const level = res.statusCode >= 400 ? 'error' : 'info';
    logger[level](`${req.method} ${req.originalUrl} completed`, meta);
  },

  // Helper method for error logging with stack traces
  logError: (error, meta = {}) => {
    logger.error(error.message, {
      ...meta,
      stack: error.stack,
      name: error.name,
      code: error.code,
    });
  },

  // Helper method for database query logging
  logDatabase: (query, duration, rowCount) => {
    const meta = {
      query,
      duration: `${duration}ms`,
      rowCount,
    };

    // Log slow queries as warnings
    if (duration > 100) {
      logger.warn('Slow database query', meta);
    } else {
      logger.debug('Database query executed', meta);
    }
  },

  // Helper method for request logging
  logRequest: (req, message, meta = {}) => {
    const requestMeta = {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id,
      ...meta,
    };

    logger.info(message, requestMeta);
  },
};
