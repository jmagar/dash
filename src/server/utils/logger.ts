import path from 'path';

import { createLogger, format, transports, transport } from 'winston';

import type {
  Logger,
  ContextualLogger,
  LoggerConfig,
  LogMetadata,
  LogContext,
  LogOptions,
  LogLevel,
} from '../../types/logger';

const { combine, timestamp, printf, colorize, json } = format;

/**
 * Default logging configuration
 */
const defaultConfig: LoggerConfig = {
  level: (process.env.LOG_LEVEL as LogLevel) || 'info',
  format: 'json',
  timestamp: true,
  colors: true,
  console: true,
  maxSize: '10m',
  maxFiles: 5,
};

/**
 * Server-side logger implementation with context support
 */
class ServerLogger implements ContextualLogger {
  private static instance: ServerLogger;
  private logger: ReturnType<typeof createLogger>;
  private context: LogContext | null = null;

  private constructor(config: Partial<LoggerConfig> = {}) {
    const finalConfig = { ...defaultConfig, ...config };

    // Custom log format with metadata support
    const logFormat = printf(({ level, message, timestamp, context, ...meta }) => {
      const contextStr = context ? `[${context}] ` : '';
      const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
      return `${timestamp} [${level}]: ${contextStr}${message}${metaStr}`;
    });

    // Create logs directory path
    const logsDir = path.join(__dirname, '../../../logs');

    // Configure transports array
    const logTransports: transport[] = [
      // Error log file
      new transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        format: json(),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      // Combined log file with daily rotation
      new transports.File({
        filename: path.join(logsDir, `app-${new Date().toISOString().split('T')[0]}.log`),
        format: json(),
        maxsize: 10485760, // 10MB
        maxFiles: finalConfig.maxFiles,
      }),
    ];

    // Add console transport in development
    if (finalConfig.console) {
      logTransports.push(
        new transports.Console({
          format: combine(
            colorize(),
            logFormat,
          ),
        }),
      );
    }

    this.logger = createLogger({
      level: finalConfig.level,
      format: combine(
        timestamp(),
        finalConfig.colors ? colorize() : format.simple(),
        logFormat,
      ),
      transports: logTransports,
      // Handle uncaught exceptions
      exceptionHandlers: [
        new transports.File({
          filename: path.join(logsDir, 'exceptions.log'),
          format: json(),
        }),
      ],
      // Don't exit on handled exceptions
      exitOnError: false,
    });

    // Add error event handler
    this.logger.on('error', (error) => {
      console.error('Logger error:', error);
    });

    // Handle uncaught exceptions and unhandled rejections
    process.on('uncaughtException', (error) => {
      this.error('Uncaught Exception:', { error });
      // Give logger time to write before exiting
      setTimeout(() => process.exit(1), 1000);
    });

    process.on('unhandledRejection', (reason) => {
      this.error('Unhandled Rejection:', {
        error: reason instanceof Error ? reason : new Error(String(reason)),
      });
    });
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: Partial<LoggerConfig>): ServerLogger {
    if (!ServerLogger.instance) {
      ServerLogger.instance = new ServerLogger(config);
    }
    return ServerLogger.instance;
  }

  /**
   * Create a new logger instance with context
   */
  withContext(context: LogContext): Logger {
    const contextualLogger = new ServerLogger();
    contextualLogger.context = context;
    return contextualLogger;
  }

  /**
   * Create a child logger with additional options
   */
  child(options: LogOptions): Logger {
    const childLogger = new ServerLogger();
    childLogger.context = this.context;
    return childLogger;
  }

  /**
   * Add context to metadata
   */
  private addContext(meta?: LogMetadata): LogMetadata {
    if (!this.context) return meta || {};
    return {
      ...meta,
      component: this.context.component,
      requestId: this.context.requestId,
      userId: this.context.userId,
      hostId: this.context.hostId,
    };
  }

  /**
   * Log methods with context and metadata support
   */
  info(message: string, meta?: LogMetadata): void {
    this.logger.info(message, this.addContext(meta));
  }

  warn(message: string, meta?: LogMetadata): void {
    this.logger.warn(message, this.addContext(meta));
  }

  error(message: string, meta?: LogMetadata): void {
    this.logger.error(message, this.addContext(meta));
  }

  debug(message: string, meta?: LogMetadata): void {
    this.logger.debug(message, this.addContext(meta));
  }
}

// Export singleton instance
export const logger = ServerLogger.getInstance();

// Export a function to create contextual loggers
export function createContextLogger(context: LogContext): Logger {
  return logger.withContext(context);
}
