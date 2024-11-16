import type { Logger, LogMetadata } from '../../types/logger';

/**
 * Frontend logger implementation with context support and browser-specific features
 */
class FrontendLogger implements Logger {
  private static instance: FrontendLogger;
  private context: LogMetadata = {};

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
  withContext(context: LogMetadata): Logger {
    const newLogger = new FrontendLogger();
    newLogger.context = { ...this.context, ...context };
    return newLogger;
  }

  /**
   * Format metadata with context
   */
  private formatMeta(meta?: LogMetadata): LogMetadata {
    const formattedMeta: LogMetadata = {
      timestamp: new Date().toISOString(),
      ...meta,
    };

    return { ...this.context, ...formattedMeta };
  }

  /**
   * Format log message with context
   */
  private formatMessage(level: string, message: string, meta?: LogMetadata): string {
    return `[${level}] ${message}`;
  }

  /**
   * Log methods with context and metadata support
   */
  error(message: string, metadata?: LogMetadata): void {
    const formattedMeta = this.formatMeta(metadata);
    console.error(this.formatMessage('ERROR', message), formattedMeta);

    // In development, also log to error monitoring service if available
    if (process.env.NODE_ENV === 'development' && metadata?.error instanceof Error) {
      console.error('Error details:', {
        name: metadata.error.name,
        message: metadata.error.message,
        stack: metadata.error.stack,
      });
    }
  }

  warn(message: string, metadata?: LogMetadata): void {
    const formattedMeta = this.formatMeta(metadata);
    console.warn(this.formatMessage('WARN', message), formattedMeta);
  }

  info(message: string, metadata?: LogMetadata): void {
    const formattedMeta = this.formatMeta(metadata);
    console.info(this.formatMessage('INFO', message), formattedMeta);
  }

  debug(message: string, metadata?: LogMetadata): void {
    const formattedMeta = this.formatMeta(metadata);
    console.debug(this.formatMessage('DEBUG', message), formattedMeta);
  }

  critical(message: string, metadata?: LogMetadata): void {
    const formattedMeta = this.formatMeta(metadata);
    console.error(this.formatMessage('CRITICAL', message), formattedMeta);
  }
}

// Export singleton instance
export const logger = FrontendLogger.getInstance();
