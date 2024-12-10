import { LogLevel } from './logger';

export interface LogEntry {
  id: string;
  hostId: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  source: string;
  metadata?: Record<string, unknown>;
}

export interface LogFilter {
  level?: LogLevel;
  source?: string;
  search?: string;
  startTime?: string;
  endTime?: string;
  limit?: number;
}

export interface LogStats {
  totalLogs: number;
  errorCount: number;
  warnCount: number;
  infoCount: number;
  debugCount: number;
  sources: string[];
  startTime: string;
  endTime: string;
}
