/**
 * Logging system type definitions
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'critical';

export interface LogContext {
  requestId?: string;
  userId?: string;
  hostId?: string;
  component?: string;
  [key: string]: unknown;
}

export interface LogMetadata extends LogContext {
  error?: string | Error;
  statusCode?: number;
  path?: string;
  method?: string;
  ip?: string;
  timing?: {
    total?: number;
    db?: number;
    processing?: number;
  };
  responseSize?: number;
  containerId?: string;
  stackId?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  metadata?: LogMetadata;
}

export interface LogOptions {
  timestamp?: boolean;
  colors?: boolean;
  level?: LogLevel;
}

export interface Logger {
  error(message: string, metadata?: LogMetadata): void;
  warn(message: string, metadata?: LogMetadata): void;
  info(message: string, metadata?: LogMetadata): void;
  debug(message: string, metadata?: LogMetadata): void;
  withContext(context: LogContext): Logger;
  critical(message: string, metadata?: LogMetadata & { notify?: boolean }): void;
}

/**
 * Extended logger interface with context support
 */
export interface ExtendedLogger extends Logger {
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
