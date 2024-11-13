/**
 * Logging system type definitions
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogMetadata {
  [key: string]: unknown;
  timestamp?: string;
  context?: string;
  requestId?: string;
  userId?: string;
  hostId?: string;
  component?: string;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  meta?: LogMetadata;
}

export interface LogOptions {
  timestamp?: boolean;
  colors?: boolean;
  metadata?: LogMetadata;
}

export interface LogContext {
  component: string;
  requestId?: string;
  userId?: string;
  hostId?: string;
}

/**
 * Core logger interface that all logger implementations must follow
 */
export interface Logger {
  info(message: string, meta?: LogMetadata): void;
  warn(message: string, meta?: LogMetadata): void;
  error(message: string, meta?: LogMetadata): void;
  debug(message: string, meta?: LogMetadata): void;
}

/**
 * Extended logger interface with context support
 */
export interface ContextualLogger extends Logger {
  withContext(context: LogContext): Logger;
  child(options: LogOptions): Logger;
}

/**
 * Logger configuration interface
 */
export interface LoggerConfig {
  level: LogLevel;
  format: 'json' | 'text';
  timestamp: boolean;
  colors: boolean;
  filepath?: string;
  maxSize?: string;
  maxFiles?: number;
  console: boolean;
}
