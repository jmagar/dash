export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

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

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  critical(message: string, meta?: Record<string, unknown>): void;
}

export interface LoggerOptions {
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

export interface LogMetadata {
  error?: string | Error;
  [key: string]: unknown;
}

export interface LogStats {
  total: number;
  byLevel: Record<LogLevel, number>;
  byHost: Record<string, number>;
  bySource: Record<string, number>;
}

// Re-export types for backward compatibility
export type { LogEntry as ServerLogEntry, LogFilter as ServerLogFilter };
