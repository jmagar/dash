import winston from 'winston';
import { MetricsManager } from '../metrics/MetricsManager';
import { ConfigManager } from '../config/ConfigManager';
import { LoggingManager } from '../../../../../../../../../../utils/logging/LoggingManager';

export interface LogMetadata {
  [key: string]: any;
  error?: Error | string;
  context?: string;
  requestId?: string;
  userId?: string;
}

export class LoggingManager {
  private static instance: LoggingManager;
  private logger: winston.Logger;
  private metricsManager: MetricsManager;
  private configManager: ConfigManager;

  private constructor() {
    this.metricsManager = MetricsManager.getInstance();
    this.configManager = ConfigManager.getInstance();
    
    // Initialize logging metrics
    this.metricsManager.createCounter('log_entries_total', 'Total log entries');
    this.metricsManager.createCounter('log_errors_total', 'Total error logs');

    this.logger = winston.createLogger({
      level: this.configManager.get<string>('logging.level') || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        this.createCustomFormat()
      ),
      transports: this.createTransports(),
      exceptionHandlers: this.createTransports(),
      rejectionHandlers: this.createTransports(),
      exitOnError: false
    });
  }

  public static getInstance(): LoggingManager {
    if (!LoggingManager.instance) {
      LoggingManager.instance = new LoggingManager();
    }
    return LoggingManager.instance;
  }

  private createCustomFormat() {
    return winston.format((info) => {
      // Add environment info
      info.environment = process.env.NODE_ENV || 'development';
      info.service = this.configManager.get<string>('app.name');
      info.version = this.configManager.get<string>('app.version');

      // Sanitize sensitive data
      if (info.metadata) {
        info.metadata = this.sanitizeMetadata(info.metadata);
      }

      return info;
    })();
  }

  private createTransports(): winston.transport[] {
    const transports: winston.transport[] = [];

    // Console transport
    transports.push(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }));

    // File transport for errors
    transports.push(new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }));

    // File transport for all logs
    transports.push(new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }));

    return transports;
  }

  private sanitizeMetadata(metadata: LogMetadata): LogMetadata {
    const sensitiveKeys = ['password', 'token', 'secret', 'key'];
    const sanitized = { ...metadata };

    const sanitizeObject = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return obj;

      return Object.entries(obj).reduce((acc, [key, value]) => {
        if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
          acc[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          acc[key] = sanitizeObject(value);
        } else {
          acc[key] = value;
        }
        return acc;
      }, {} as any);
    };

    return sanitizeObject(sanitized);
  }

  private formatError(error: Error | string): object {
    if (error instanceof Error) {
      return {
        message: error.message,
        name: error.name,
        stack: error.stack,
      };
    }
    return { message: error };
  }

  private logWithMetrics(level: string, message: string, metadata?: LogMetadata) {
    this.metricsManager.incrementCounter('log_entries_total', { level });
    
    if (level === 'error' || level === 'fatal') {
      this.metricsManager.incrementCounter('log_errors_total');
    }

    const formattedMetadata = metadata ? this.sanitizeMetadata(metadata) : {};
    if (metadata?.error) {
      formattedMetadata.error = this.formatError(metadata.error);
    }

    this.logger.log(level, message, formattedMetadata);
  }

  public debug(message: string, metadata?: LogMetadata): void {
    this.logWithMetrics('debug', message, metadata);
  }

  public info(message: string, metadata?: LogMetadata): void {
    this.logWithMetrics('info', message, metadata);
  }

  public warn(message: string, metadata?: LogMetadata): void {
    this.logWithMetrics('warn', message, metadata);
  }

  public error(message: string, metadata?: LogMetadata): void {
    this.logWithMetrics('error', message, metadata);
  }

  public fatal(message: string, metadata?: LogMetadata): void {
    this.logWithMetrics('fatal', message, metadata);
  }

  public createChildLogger(context: string) {
    return {
      debug: (message: string, metadata?: LogMetadata) => 
        thisLoggingManager.getInstance().(),
      info: (message: string, metadata?: LogMetadata) => 
        thisLoggingManager.getInstance().(),
      warn: (message: string, metadata?: LogMetadata) => 
        thisLoggingManager.getInstance().(),
      error: (message: string, metadata?: LogMetadata) => 
        thisLoggingManager.getInstance().(),
      fatal: (message: string, metadata?: LogMetadata) => 
        this.fatal(message, { ...metadata, context })
    };
  }
}

export default LoggingManager.getInstance();

