import type { Logger } from '../../types/logging';

class FrontendLogger implements Logger {
  private static instance: FrontendLogger;

  private constructor() {}

  static getInstance(): FrontendLogger {
    if (!FrontendLogger.instance) {
      FrontendLogger.instance = new FrontendLogger();
    }
    return FrontendLogger.instance;
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
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    const formattedMeta = this.formatMeta(meta);
    const timestamp = new Date().toISOString();
    // eslint-disable-next-line no-console
    console.debug(`[${timestamp}] DEBUG:`, message, formattedMeta);
  }

  private formatMeta(meta?: Record<string, unknown>): Record<string, unknown> {
    if (!meta) return {};
    return meta;
  }

  static init(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        const logger = FrontendLogger.getInstance();
        logger.error('Unhandled Promise Rejection:', {
          reason: event.reason,
          error: event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        });
      });

      window.addEventListener('error', (event) => {
        const logger = FrontendLogger.getInstance();
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
}

// Initialize logger if in browser environment
if (typeof window !== 'undefined') {
  FrontendLogger.init();
}

// Export the logger instance
export const logger = FrontendLogger.getInstance();
