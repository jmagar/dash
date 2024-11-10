import fs from 'fs';
import path from 'path';

// Ensure logs directory exists in project root
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

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
    meta
  };
  return JSON.stringify(logData, null, 2);
};

// Write log to file (Node.js environment only)
const writeToFile = (formattedLog: string, level: LogLevel): void => {
  if (typeof window === 'undefined') {
    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(logsDir, `${level}-${date}.log`);
    fs.appendFileSync(logFile, `${formattedLog}\n`);
  }
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

  // Send to backend for file logging
  fetch('/api/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: formattedLog,
  }).catch(() => console.error('Failed to send log to server'));
};

// Node.js specific logging
const nodeLog = (level: LogLevel, message: string, meta: LogMeta = {}): void => {
  const formattedLog = formatLog(level, message, meta);

  // Console output
  switch (level) {
    case LogLevel.ERROR:
      console.error(formattedLog);
      break;
    case LogLevel.WARN:
      console.warn(formattedLog);
      break;
    case LogLevel.INFO:
      console.info(formattedLog);
      break;
    case LogLevel.DEBUG:
      console.debug(formattedLog);
      break;
  }

  // File output
  writeToFile(formattedLog, level);
};

// Universal logging method
const log = (level: LogLevel, message: string, meta: LogMeta = {}): void => {
  if (shouldLog(level)) {
    if (typeof window !== 'undefined') {
      browserLog(level, message, meta);
    } else {
      nodeLog(level, message, meta);
    }
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

// Express middleware type
import { Request, Response, NextFunction } from 'express';

// Create request logger middleware
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
