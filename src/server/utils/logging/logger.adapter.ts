import type { Logger, LogMetadata, LogContext } from '../../../types/logger';
import { LoggingManager } from '../../managers/LoggingManager';

/**
 * Adapter to make LoggingManager match Logger interface.
 * Provides type-safe logging with context management.
 * 
 * Usage:
 * ```typescript
 * private readonly logger: Logger;
 * 
 * constructor() {
 *   const baseLogger = LoggingManager.getInstance();
 *   this.logger = new LoggerAdapter(baseLogger, { component: 'YourService' });
 * }
 * ```
 */
export class LoggerAdapter implements Logger {
  constructor(
    private readonly logger: LoggingManager,
    private readonly context: LogContext
  ) {}

  withContext(context: LogContext): Logger {
    return new LoggerAdapter(this.logger, { ...this.context, ...context });
  }

  info(message: string, metadata?: LogMetadata): void {
    this.logger.info(message, { ...metadata, ...this.context });
  }

  warn(message: string, metadata?: LogMetadata): void {
    this.logger.warn(message, { ...metadata, ...this.context });
  }

  error(message: string, metadata?: LogMetadata): void {
    this.logger.error(message, { ...metadata, ...this.context });
  }

  debug(message: string, metadata?: LogMetadata): void {
    this.logger.debug?.(message, { ...metadata, ...this.context });
  }

  critical(message: string, metadata?: LogMetadata & { notify?: boolean }): void {
    this.logger.error(message, { ...metadata, ...this.context, level: 'critical' });
  }
}
