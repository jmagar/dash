// Fallback UUID generation if uuid package fails
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: Error;
}

class FrontendLogger {
  private static instance: FrontendLogger;
  private logs: LogEntry[] = [];
  private maxLogEntries = 500;
  private remoteLoggingEnabled = false;
  private remoteLoggingUrl?: string;

  private constructor() {
    this.setupUnhandledErrorListeners();
  }

  public static getInstance(): FrontendLogger {
    if (!FrontendLogger.instance) {
      FrontendLogger.instance = new FrontendLogger();
    }
    return FrontendLogger.instance;
  }

  private setupUnhandledErrorListeners(): void {
    window.addEventListener('error', (event) => {
      this.error('Unhandled Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled Promise Rejection', {
        reason: event.reason,
      });
    });
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error,
  ): LogEntry {
    const entry: LogEntry = {
      id: generateUUID(),
      timestamp: Date.now(),
      level,
      message,
      context,
      error,
    };

    // Manage log size
    if (this.logs.length >= this.maxLogEntries) {
      this.logs.shift();
    }
    this.logs.push(entry);

    // Console output
    this.consoleOutput(entry);

    // Remote logging
    if (this.remoteLoggingEnabled) {
      this.sendRemoteLog(entry);
    }

    return entry;
  }

  private consoleOutput(entry: LogEntry): void {
    const { level, message, context, error } = entry;

    switch (level) {
      case LogLevel.ERROR:
        // eslint-disable-next-line no-console
        console.error(message, context, error);
        break;
      case LogLevel.WARN:
        // eslint-disable-next-line no-console
        console.warn(message, context);
        break;
      case LogLevel.INFO:
        // eslint-disable-next-line no-console
        console.info(message, context);
        break;
      case LogLevel.DEBUG:
        // eslint-disable-next-line no-console
        console.debug(message, context);
        break;
    }
  }

  private async sendRemoteLog(entry: LogEntry): Promise<void> {
    if (!this.remoteLoggingUrl) return;

    try {
      await fetch(this.remoteLoggingUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      });
    } catch {
      // Silently fail to prevent logging errors from breaking app
      this.warn('Remote logging failed');
    }
  }

  public error(
    message: string,
    context?: Record<string, unknown>,
    error?: Error,
  ): LogEntry {
    return this.createLogEntry(LogLevel.ERROR, message, context, error);
  }

  public warn(
    message: string,
    context?: Record<string, unknown>,
  ): LogEntry {
    return this.createLogEntry(LogLevel.WARN, message, context);
  }

  public info(
    message: string,
    context?: Record<string, unknown>,
  ): LogEntry {
    return this.createLogEntry(LogLevel.INFO, message, context);
  }

  public debug(
    message: string,
    context?: Record<string, unknown>,
  ): LogEntry {
    return this.createLogEntry(LogLevel.DEBUG, message, context);
  }

  public enableRemoteLogging(url: string): void {
    this.remoteLoggingEnabled = true;
    this.remoteLoggingUrl = url;
  }

  public disableRemoteLogging(): void {
    this.remoteLoggingEnabled = false;
    this.remoteLoggingUrl = undefined;
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public clearLogs(): void {
    this.logs = [];
  }
}

export const logger = FrontendLogger.getInstance();
export default logger;
