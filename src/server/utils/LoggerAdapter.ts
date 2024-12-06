import type { Logger, LogContext, LogMetadata } from '../../types/logger';
import { LoggingManager } from '../managers/LoggingManager';

export class LoggerAdapter implements Logger {
  constructor(
    private manager: LoggingManager,
    private context: LogContext = {}
  ) {}

  private mergeMetadata(metadata?: LogMetadata): LogMetadata {
    return {
      ...this.context,
      ...metadata
    };
  }

  error(message: string, metadata?: LogMetadata): void {
    this.manager.error(message, this.mergeMetadata(metadata));
  }

  warn(message: string, metadata?: LogMetadata): void {
    this.manager.warn(message, this.mergeMetadata(metadata));
  }

  info(message: string, metadata?: LogMetadata): void {
    this.manager.info(message, this.mergeMetadata(metadata));
  }

  debug(message: string, metadata?: LogMetadata): void {
    this.manager.debug(message, this.mergeMetadata(metadata));
  }

  critical(message: string, metadata?: LogMetadata & { notify?: boolean }): void {
    this.manager.error(message, { ...this.mergeMetadata(metadata), critical: true });
  }

  withContext(context: LogContext): Logger {
    return new LoggerAdapter(this.manager, { ...this.context, ...context });
  }
}
