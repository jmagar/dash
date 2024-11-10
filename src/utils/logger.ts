import type { Request, Response, NextFunction } from 'express';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

interface LogMeta {
  [key: string]: unknown;
}

interface LogData {
  timestamp: string;
  level: LogLevel;
  message: string;
  meta?: LogMeta;
}

// Get configured log level from environment or default to 'info'
const LOG_LEVEL = (process.env.LOG_LEVEL as LogLevel) || LogLevel.DEBUG;

// Log level weights for filtering
const LOG_LEVEL_WEIGHTS: Record<LogLevel, number> = {
  [LogLevel.ERROR]: 0,
  [LogLevel.WARN]: 1,
  [LogLevel.INFO]: 2,
  [LogLevel.DEBUG]: 3,
};

// Check if a log level should be logged based on configured level
const shouldLog = (level: LogLevel): boolean => {
  const configuredWeight = LOG_LEVEL_WEIGHTS[LOG_LEVEL];
  const messageWeight = LOG_LEVEL_WEIGHTS[level];
  return messageWeight <= configuredWeight;
};

// Format log message
const formatLog = (level: LogLevel, message: string, meta: LogMeta = {}): string => {
  const logData: LogData = {
    timestamp: new Date().toISOString(),
    level,
    message,
    meta,
  };
  return JSON.stringify(logData, null, 2);
};

// Browser-specific logging
const browserLog = (level: LogLevel, message: string, meta: LogMeta = {}): void => {
  const formattedLog = formatLog(level, message, meta);

  // Log to browser console
  switch (level) {
    case LogLevel.ERROR:
      console.error(message, meta);
      break;
    case LogLevel.WARN:
      console.warn(message, meta);
      break;
    case LogLevel.INFO:
      console.info(message, meta);
      break;
    case LogLevel.DEBUG:
      console.debug(message, meta);
      break;
  }

  // Send to server for file logging
  if (typeof fetch !== 'undefined') {
    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: formattedLog,
    }).catch(() => console.error('Failed to send log to server'));
  }
};

// Universal logging method
const log = (level: LogLevel, message: string, meta: LogMeta = {}): void => {
  if (shouldLog(level)) {
    browserLog(level, message, meta);
  }
};

// Logger interface
export interface Logger {
  error: (message: string, meta?: LogMeta) => void;
  warn: (message: string, meta?: LogMeta) => void;
  info: (message: string, meta?: LogMeta) => void;
  debug: (message: string, meta?: LogMeta) => void;
}

// Create logger instance
export const logger: Logger = {
  error: (message: string, meta: LogMeta = {}) => log(LogLevel.ERROR, message, meta),
  warn: (message: string, meta: LogMeta = {}) => log(LogLevel.WARN, message, meta),
  info: (message: string, meta: LogMeta = {}) => log(LogLevel.INFO, message, meta),
  debug: (message: string, meta: LogMeta = {}) => log(LogLevel.DEBUG, message, meta),
};

// Request logger middleware for Express
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  // Log request
  logger.info(`Incoming ${req.method} request to ${req.url}`, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    query: req.query,
    body: req.body,
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`Response sent for ${req.method} ${req.url}`, {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
};

export default logger;
