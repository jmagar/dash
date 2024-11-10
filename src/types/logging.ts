import type { LogLevel } from './logger';

export interface LogConfig {
  level: LogLevel;
  format?: 'json' | 'text';
  timestamp?: boolean;
  colors?: boolean;
}

export interface LogFormatter {
  format(entry: LogEntry): string;
}

export interface LogTransport {
  log(entry: LogEntry): void;
  setFormatter(formatter: LogFormatter): void;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}

export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

export interface LoggerOptions {
  level?: LogLevel;
  transports?: LogTransport[];
  format?: 'json' | 'text';
  timestamp?: boolean;
  colors?: boolean;
}
