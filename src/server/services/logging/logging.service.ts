import { Logger, LogMetadata, LogLevel, LogContext } from '../../../types/logger';
import { logger } from '../../utils/logger';
import { LoggingManager } from '../../managers/utils/LoggingManager';

/**
 * Structured logging service that ensures consistent log format and context
 * across the application. Features:
 * 1. Operation tracking with timing
 * 2. Automatic error enrichment
 * 3. Context propagation
 * 4. Standard metadata fields
 */
export class LoggingService {
  private context: LogContext;
  private logger: Logger;

  constructor(context: LogContext = {}) {
    this.context = context;
    this.logger = logger.withContext(context);
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): LoggingService {
    return new LoggingService({
      ...this.context,
      ...additionalContext
    });
  }

  /**
   * Log host operation with timing and result
   */
  logHostOperation(params: {
    operation: string;
    hostId: string;
    success: boolean;
    startTime: number;
    error?: Error;
    metadata?: LogMetadata;
  }): void {
    const { operation, hostId, success, startTime, error, metadata = {} } = params;
    const duration = Date.now() - startTime;

    const level: LogLevel = success ? 'info' : 'error';
    const message = success
      ? `Host operation successful: ${operation}`
      : `Host operation failed: ${operation}`;

    this.log(level, message, {
      ...metadata,
      hostId,
      operation,
      success,
      timing: {
        total: duration,
        ...metadata.timing
      },
      error: error ? {
        message: error.message,
        name: error.name,
        stack: error.stack
      } : undefined
    });
  }

  /**
   * Log SSH operation with timing and result
   */
  logSSHOperation(params: {
    operation: string;
    hostId: string;
    command?: string;
    success: boolean;
    startTime: number;
    error?: Error;
    metadata?: LogMetadata;
  }): void {
    const { operation, hostId, command, success, startTime, error, metadata = {} } = params;
    const duration = Date.now() - startTime;

    const level: LogLevel = success ? 'info' : 'error';
    const message = success
      ? `SSH operation successful: ${operation}`
      : `SSH operation failed: ${operation}`;

    this.log(level, message, {
      ...metadata,
      hostId,
      operation,
      command,
      success,
      timing: {
        total: duration,
        ...metadata.timing
      },
      error: error ? {
        message: error.message,
        name: error.name,
        stack: error.stack
      } : undefined
    });
  }

  /**
   * Log agent operation with timing and result
   */
  logAgentOperation(params: {
    operation: string;
    hostId: string;
    agentId: string;
    success: boolean;
    startTime: number;
    error?: Error;
    metadata?: LogMetadata;
  }): void {
    const { operation, hostId, agentId, success, startTime, error, metadata = {} } = params;
    const duration = Date.now() - startTime;

    const level: LogLevel = success ? 'info' : 'error';
    const message = success
      ? `Agent operation successful: ${operation}`
      : `Agent operation failed: ${operation}`;

    this.log(level, message, {
      ...metadata,
      hostId,
      agentId,
      operation,
      success,
      timing: {
        total: duration,
        ...metadata.timing
      },
      error: error ? {
        message: error.message,
        name: error.name,
        stack: error.stack
      } : undefined
    });
  }

  /**
   * Log state transition
   */
  logStateTransition(params: {
    hostId: string;
    fromState: string;
    toState: string;
    reason: string;
    metadata?: LogMetadata;
  }): void {
    const { hostId, fromState, toState, reason, metadata = {} } = params;

    thisLoggingManager.getInstance().();
  }

  /**
   * Log system health check
   */
  logHealthCheck(params: {
    hostId: string;
    checks: Array<{
      name: string;
      success: boolean;
      value?: number | string;
      threshold?: number | string;
      error?: Error;
    }>;
    metadata?: LogMetadata;
  }): void {
    const { hostId, checks, metadata = {} } = params;
    const allSuccess = checks.every(c => c.success);

    const level: LogLevel = allSuccess ? 'info' : 'warn';
    const message = allSuccess
      ? 'Health check passed'
      : 'Health check failed';

    this.log(level, message, {
      ...metadata,
      hostId,
      healthChecks: checks.map(check => ({
        name: check.name,
        success: check.success,
        value: check.value,
        threshold: check.threshold,
        error: check.error ? {
          message: check.error.message,
          name: check.error.name
        } : undefined
      }))
    });
  }

  // Base logging methods
  error(message: string, metadata?: LogMetadata): void {
    this.log('error', message, metadata);
  }

  warn(message: string, metadata?: LogMetadata): void {
    this.log('warn', message, metadata);
  }

  info(message: string, metadata?: LogMetadata): void {
    this.log('info', message, metadata);
  }

  debug(message: string, metadata?: LogMetadata): void {
    this.log('debug', message, metadata);
  }

  critical(message: string, metadata?: LogMetadata & { notify?: boolean }): void {
    this.log('critical', message, metadata);
  }

  private log(level: LogLevel, message: string, metadata?: LogMetadata): void {
    this.logger[level](message, {
      ...this.enrichMetadata(metadata)
    });
  }

  private enrichMetadata(metadata: LogMetadata = {}): LogMetadata {
    return {
      ...metadata,
      timestamp: new Date().toISOString(),
      component: metadata.component || this.context.component,
      // Add any other standard fields here
    };
  }
}


