import { LogLevel } from './logger';

export interface LogMeta {
  [key: string]: unknown;
}

export interface LogData {
  timestamp: string;
  level: LogLevel;
  message: string;
  meta?: LogMeta;
}

export interface Logger {
  error: (message: string, meta?: LogMeta) => void;
  warn: (message: string, meta?: LogMeta) => void;
  info: (message: string, meta?: LogMeta) => void;
  debug: (message: string, meta?: LogMeta) => void;
}
