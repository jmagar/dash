import { Injectable } from '@nestjs/common';
import { BaseService } from './base-service';
import { ServiceConfig } from '../types/service-config';
import { EventEmitter } from 'events';
import { LogLevel } from '../../types/logger';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  service: string;
  message: string;
  context?: Record<string, unknown>;
  error?: Error;
}

export interface LoggerEvents {
  'log:entry': (entry: LogEntry) => void;
  'log:error': (entry: LogEntry) => void;
  'log:flush': () => void;
}

export interface LoggerConfig extends ServiceConfig {
  maxLogs?: number;
  flushInterval?: number;
}

@Injectable()
export class ServiceLogger extends BaseService {
  private readonly logEmitter: EventEmitter;
  private readonly logs: LogEntry[];
  private readonly maxLogs: number;
  private flushInterval?: NodeJS.Timeout;

  constructor(config: LoggerConfig) {
    super({
      name: 'service-logger',
      version: '1.0.0',
      ...config
    });

    this.logEmitter = new EventEmitter();
    this.logs = [];
    this.maxLogs = config.maxLogs || 1000;

    // Bind methods
    this.log = this.log.bind(this);
    this.debug = this.debug.bind(this);
    this.info = this.info.bind(this);
    this.warn = this.warn.bind(this);
    this.error = this.error.bind(this);
    this.fatal = this.fatal.bind(this);
  }

  /**
   * Log a message at a specific level
   */
  public log(
    level: LogLevel,
    service: string,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      service,
      message,
      context,
      error
    };

    // Add to logs array
    this.logs.push(entry);

    // Trim logs if exceeding max size
    if (this.logs.length > this.maxLogs) {
      this.logs.splice(0, this.logs.length - this.maxLogs);
    }

    // Emit log entry event
    this.logEmitter.emit('log:entry', entry);

    // Also emit error event for error logs
    if (level === 'error' || level === 'fatal') {
      this.logEmitter.emit('log:error', entry);
    }

    // Console output for development
    const logFn = this.getConsoleMethod(level);
    logFn(`[${entry.timestamp.toISOString()}] [${level.toUpperCase()}] [${service}] ${message}`);
    if (context) logFn('Context:', context);
    if (error) logFn('Error:', error);
  }

  /**
   * Log at debug level
   */
  public debug(service: string, message: string, context?: Record<string, unknown>): void {
    this.log('debug', service, message, context);
  }

  /**
   * Log at info level
   */
  public info(service: string, message: string, context?: Record<string, unknown>): void {
    this.log('info', service, message, context);
  }

  /**
   * Log at warn level
   */
  public warn(service: string, message: string, context?: Record<string, unknown>): void {
    this.log('warn', service, message, context);
  }

  /**
   * Log at error level
   */
  public error(service: string, message: string, error: Error, context?: Record<string, unknown>): void {
    this.log('error', service, message, context, error);
  }

  /**
   * Log at fatal level
   */
  public fatal(service: string, message: string, error: Error, context?: Record<string, unknown>): void {
    this.log('fatal', service, message, context, error);
  }

  /**
   * Get logs for a service
   */
  public getServiceLogs(service: string, level?: LogLevel): LogEntry[] {
    return this.logs.filter(
      log => log.service === service && (!level || log.level === level)
    );
  }

  /**
   * Get all logs
   */
  public getAllLogs(level?: LogLevel): LogEntry[] {
    return level ? this.logs.filter(log => log.level === level) : [...this.logs];
  }

  /**
   * Clear logs
   */
  public clearLogs(): void {
    this.logs.length = 0;
    this.logEmitter.emit('log:flush');
  }

  /**
   * Subscribe to logger events
   */
  public on<K extends keyof LoggerEvents>(
    event: K,
    listener: LoggerEvents[K]
  ): this {
    this.logEmitter.on(event, listener);
    return this;
  }

  /**
   * Get the appropriate console method for the log level
   */
  private getConsoleMethod(level: LogLevel): (message?: unknown, ...args: unknown[]) => void {
    switch (level) {
      case 'debug':
        return console.debug;
      case 'info':
        return console.info;
      case 'warn':
        return console.warn;
      case 'error':
      case 'fatal':
        return console.error;
      default:
        return console.log;
    }
  }

  protected async onStart(): Promise<void> {
    const config = this.config as LoggerConfig;
    if (config.flushInterval) {
      this.flushInterval = setInterval(() => {
        this.clearLogs();
      }, config.flushInterval);
    }
  }

  protected async onStop(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = undefined;
    }
    this.clearLogs();
    this.logEmitter.removeAllListeners();
  }
}
