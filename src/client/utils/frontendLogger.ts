import type { Logger } from '../../types/logging';

class FrontendLogger implements Logger {
  private formatError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
        name: error.name,
        ...(Object.getOwnPropertyNames(error).reduce((acc, key) => {
          acc[key] = (error as unknown as Record<string, unknown>)[key];
          return acc;
        }, {} as Record<string, unknown>)),
      };
    }
    return { error };
  }

  private formatMeta(meta?: Record<string, unknown>): Record<string, unknown> {
    if (!meta) return {};

    // Handle errors in meta objects
    const formattedMeta: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(meta)) {
      if (value instanceof Error) {
        formattedMeta[key] = this.formatError(value);
      } else if (value && typeof value === 'object' && 'stack' in value) {
        // Handle error-like objects
        formattedMeta[key] = this.formatError(value);
      } else {
        formattedMeta[key] = value;
      }
    }

    return formattedMeta;
  }

  info(message: string, meta?: Record<string, unknown>): void {
    const formattedMeta = this.formatMeta(meta);
    const timestamp = new Date().toISOString();
    // eslint-disable-next-line no-console
    console.info(`[${timestamp}] INFO:`, message, formattedMeta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    const formattedMeta = this.formatMeta(meta);
    const timestamp = new Date().toISOString();
    // eslint-disable-next-line no-console
    console.warn(`[${timestamp}] WARN:`, message, formattedMeta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    const formattedMeta = this.formatMeta(meta);
    const timestamp = new Date().toISOString();
    // eslint-disable-next-line no-console
    console.error(`[${timestamp}] ERROR:`, message, formattedMeta);

    // Also log to window.onerror for better error tracking
    const errorMessage = `${message} ${JSON.stringify(formattedMeta)}`;
    window.onerror?.(errorMessage, undefined, undefined, undefined, new Error(errorMessage));
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    const formattedMeta = this.formatMeta(meta);
    const timestamp = new Date().toISOString();
    // eslint-disable-next-line no-console
    console.debug(`[${timestamp}] DEBUG:`, message, formattedMeta);
  }

  // Add error handler to catch unhandled promise rejections
  static init(): void {
    window.addEventListener('unhandledrejection', (event) => {
      const logger = new FrontendLogger();
      logger.error('Unhandled Promise Rejection:', {
        reason: event.reason,
        error: event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
      });
    });

    window.addEventListener('error', (event) => {
      const logger = new FrontendLogger();
      logger.error('Uncaught Error:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      });
    });
  }
}

// Initialize error handlers
FrontendLogger.init();

export const logger = new FrontendLogger();
