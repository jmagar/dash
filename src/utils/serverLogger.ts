import fs from 'fs';
import path from 'path';

import type { Request, Response, NextFunction } from 'express';

import { LogLevel } from './logger';

// Ensure logs directory exists in project root
const logsDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
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

// Write log to file
const writeToFile = (formattedLog: string, level: LogLevel): void => {
  const date = new Date().toISOString().split('T')[0];
  const logFile = path.join(logsDir, `${level}-${date}.log`);
  fs.appendFileSync(logFile, `${formattedLog}\n`);
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

// Create server logger instance
export const serverLogger = {
  error: (message: string, meta: LogMeta = {}): void => nodeLog(LogLevel.ERROR, message, meta),
  warn: (message: string, meta: LogMeta = {}): void => nodeLog(LogLevel.WARN, message, meta),
  info: (message: string, meta: LogMeta = {}): void => nodeLog(LogLevel.INFO, message, meta),
  debug: (message: string, meta: LogMeta = {}): void => nodeLog(LogLevel.DEBUG, message, meta),
};

// Request logger middleware for Express
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  // Log request
  serverLogger.info(`Incoming ${req.method} request to ${req.url}`, {
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
    serverLogger.info(`Response sent for ${req.method} ${req.url}`, {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
};

export default serverLogger;
