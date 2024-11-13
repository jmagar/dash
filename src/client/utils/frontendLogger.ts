import type {
  Logger,
  ContextualLogger,
  LogMetadata,
  LogContext,
  LogOptions,
} from '../../types/logger';

/**
 * Frontend logger implementation with context support and browser-specific features
 */
class FrontendLogger implements ContextualLogger {
  private static instance: FrontendLogger;
  private context: LogContext | null = null;

  private constructor() {
    this.setupErrorHandlers();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): FrontendLogger {
    if (!FrontendLogger.instance) {
      FrontendLogger.instance = new FrontendLogger();
    }
    return FrontendLogger.instance;
  }

  /**
   * Set up global error handlers
   */
  private setupErrorHandlers(): void {
    if (typeof window !== 'undefined') {
      // Handle unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.error('Unhandled Promise Rejection:', {
          reason: event.reason,
          error: event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        });
      });

      // Handle uncaught errors
      window.addEventListener('error', (event) => {
        this.error('Uncaught Error:', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error,
        });
      });
    }
  }

  /**
   * Create a new logger instance with context
   */
  withContext(context: LogContext): Logger {
    const contextualLogger = new FrontendLogger();
    contextualLogger.context = context;
    return contextualLogger;
  }

  /**
   * Create a child logger with additional options
   */
  child(options: LogOptions): Logger {
    const childLogger = new FrontendLogger();
    childLogger.context = this.context;
    return childLogger;
  }

  /**
   * Format metadata with context
   */
  private formatMeta(meta?: LogMetadata): LogMetadata {
    const formattedMeta: LogMetadata = {
      timestamp: new Date().toISOString(),
      ...meta,
    };

    if (this.context) {
      formattedMeta.component = this.context.component;
      formattedMeta.requestId = this.context.requestId;
      formattedMeta.userId = this.context.userId;
      formattedMeta.hostId = this.context.hostId;
    }

    return formattedMeta;
  }

  /**
   * Format log message with context
   */
  private formatMessage(level: string, message: string, meta?: LogMetadata): string {
    const contextStr = this.context ? `[${this.context.component}] ` : '';
    return `[${level}] ${contextStr}${message}`;
  }

  /**
   * Log methods with context and metadata support
   */
  info(message: string, meta?: LogMetadata): void {
    const formattedMeta = this.formatMeta(meta);
    // eslint-disable-next-line no-console
    console.info(this.formatMessage('INFO', message), formattedMeta);
  }

  warn(message: string, meta?: LogMetadata): void {
    const formattedMeta = this.formatMeta(meta);
    // eslint-disable-next-line no-console
    console.warn(this.formatMessage('WARN', message), formattedMeta);
  }

  error(message: string, meta?: LogMetadata): void {
    const formattedMeta = this.formatMeta(meta);
    // eslint-disable-next-line no-console
    console.error(this.formatMessage('ERROR', message), formattedMeta);

    // In development, also log to error monitoring service if available
    if (process.env.NODE_ENV === 'development' && meta?.error instanceof Error) {
      console.error('Error details:', {
        name: meta.error.name,
        message: meta.error.message,
        stack: meta.error.stack,
      });
    }
  }

  debug(message: string, meta?: LogMetadata): void {
    const formattedMeta = this.formatMeta(meta);
    // eslint-disable-next-line no-console
    console.debug(this.formatMessage('DEBUG', message), formattedMeta);
  }
}

// Export singleton instance
export const logger = FrontendLogger.getInstance();
