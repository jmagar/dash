/**
 * Logging system type definitions
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';

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
  id: string;
  hostId: string;
  level: LogLevel;
  message: string;
  timestamp: string;
  source: string;
  meta?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface LogConfig {
  level: LogLevel;
  format?: 'json' | 'text';
  timestamp?: boolean;
  colors?: boolean;
  filepath?: string;
  maxSize?: string;
  maxFiles?: number;
  console: boolean;
}

export interface LogFormatter {
  format(entry: LogEntry): string;
}

export interface LogTransport {
  log(entry: LogEntry): void;
  setFormatter(formatter: LogFormatter): void;
}

export interface Logger {
  notify?: boolean;
  error(message: string, metadata?: LogMetadata): void;
  warn(message: string, metadata?: LogMetadata): void;
  info(message: string, metadata?: LogMetadata): void;
  debug(message: string, metadata?: LogMetadata): void;
  withContext(context: LogContext): Logger;
  critical(message: string, metadata?: LogMetadata & { notify?: boolean }): void;
}

export interface ExtendedLogger extends Logger {
  child(options: LogOptions): Logger;
}

export interface LogOptions {
  level?: LogLevel;
  transports?: LogTransport[];
  format?: 'json' | 'text';
  timestamp?: boolean;
  colors?: boolean;
}

export interface LogFilter {
  level?: LogLevel;
  search?: string;
  startTime?: Date;
  endTime?: Date;
  hostId?: string;
  source?: string;
  limit?: number;
  offset?: number;
}

export interface LogStats {
  total: number;
  byLevel: Record<LogLevel, number>;
  byHost: Record<string, number>;
  bySource: Record<string, number>;
}

export interface LoggingManager {
  getInstance(): Logger;
  getLogger(options?: LogOptions): Logger;
  configure(config: LogConfig): void;
  addTransport(transport: LogTransport): void;
  removeTransport(transport: LogTransport): void;
}

// Re-export types for backward compatibility
export type { LogEntry as ServerLogEntry, LogFilter as ServerLogFilter };
