import type { LogLevel, LogEntry } from './logger';

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

export interface LoggerOptions {
  level?: LogLevel;
  transports?: LogTransport[];
  format?: 'json' | 'text';
  timestamp?: boolean;
  colors?: boolean;
}
