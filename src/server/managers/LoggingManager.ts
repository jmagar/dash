import winston from 'winston';
import { BaseService } from './base/BaseService';
import { ConfigManager } from './ConfigManager';
import { MetricsManager } from './MetricsManager';
import { ServiceHealth, ServiceStatus } from './base/types';
import { z } from 'zod';
import * as path from 'path';
import * as fs from 'fs/promises';

const LoggingConfigSchema = z.object({
  level: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('info'),
  format: z.enum(['json', 'simple', 'pretty']).default('json'),
  console: z.object({
    enabled: z.boolean().default(true),
    level: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).optional()
  }).default({}),
  file: z.object({
    enabled: z.boolean().default(true),
    filename: z.string().refine(val => val.includes('%DATE%'), {
      message: 'Filename must include %DATE% for log rotation'
    }),
    maxSize: z.number().min(1024).max(1024 * 1024 * 100).default(10485760), // 10MB max
    maxFiles: z.number().min(1).max(30).default(7),
    level: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).optional()
  }).default({}),
  metadata: z.object({
    service: z.boolean().default(true),
    timestamp: z.boolean().default(true),
    requestId: z.boolean().default(true),
    userId: z.boolean().default(false)
  }).default({})
});

type LoggingConfig = z.infer<typeof LoggingConfigSchema>;

export interface LoggingManagerDependencies {
  configManager: ConfigManager;
  metricsManager: MetricsManager;
}

export interface LogMetadata {
  [key: string]: any;
  error?: Error | string;
  context?: string;
  requestId?: string;
  userId?: string;
  service?: string;
  timestamp?: string;
}

export class LoggingManager extends BaseService {
  private static instance: LoggingManager;
  private winstonLogger: winston.Logger;
  private config: LoggingConfig;
  private metricsManager: MetricsManager;
  
  private logEntries: any;
  private logErrors: any;
  private logWarnings: any;
  private loggingLatency: any;
  private logFileSize: any;

  private constructor(private dependencies?: LoggingManagerDependencies) {
    super({
      name: 'LoggingManager',
      version: '1.0.0',
      dependencies: ['ConfigManager', 'MetricsManager']
    });
  }

  public static getInstance(dependencies?: LoggingManagerDependencies): LoggingManager {
    if (!LoggingManager.instance) {
      LoggingManager.instance = new LoggingManager(dependencies);
    }
    return LoggingManager.instance;
  }

  async init(): Promise<void> {
    try {
      const configManager = this.dependencies?.configManager ?? ConfigManager.getInstance();
      const metricsManager = this.dependencies?.metricsManager ?? MetricsManager.getInstance();
      this.metricsManager = metricsManager;

      this.initializeMetrics();

      const rawConfig = await configManager.get('logging');
      this.config = LoggingConfigSchema.parse({
        ...rawConfig,
        file: {
          filename: rawConfig?.file?.filename ?? 'logs/dash-%DATE%.log'
        }
      });

      const logDir = path.dirname(this.config.file.filename);
      await fs.mkdir(logDir, { recursive: true })
        .catch(err => {
          this.error('Failed to create log directory', { 
            error: err, 
            logDir 
          });
          throw err;
        });

      this.winstonLogger = winston.createLogger({
        level: this.config.level,
        format: this.createFormat(),
        transports: this.createTransports(),
        exceptionHandlers: this.createTransports(),
        rejectionHandlers: this.createTransports(),
        exitOnError: false
      });

      this.info('LoggingManager initialized successfully', {
        level: this.config.level,
        format: this.config.format,
        transports: {
          console: this.config.console.enabled,
          file: this.config.file.enabled
        }
      });
    } catch (error) {
      console.error('Failed to initialize LoggingManager:', error);
      throw error;
    }
  }

  private initializeMetrics(): void {
    this.logEntries = this.metricsManager.createCounter({
      name: 'log_entries_total',
      help: 'Total number of log entries',
      labelNames: ['level', 'service']
    });

    this.logErrors = this.metricsManager.createCounter({
      name: 'log_errors_total',
      help: 'Total number of error logs',
      labelNames: ['type', 'service']
    });

    this.logWarnings = this.metricsManager.createCounter({
      name: 'log_warnings_total',
      help: 'Total number of warning logs',
      labelNames: ['service']
    });

    this.loggingLatency = this.metricsManager.createHistogram({
      name: 'logging_latency_seconds',
      help: 'Logging operation latency in seconds',
      labelNames: ['level'],
      buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.5]
    });

    this.logFileSize = this.metricsManager.createGauge({
      name: 'log_file_size_bytes',
      help: 'Size of log files'
    });
  }

  private createFormat(): winston.Logform.Format {
    const formats = [
      winston.format.errors({ stack: true }),
      winston.format.timestamp()
    ];

    if (this.config.metadata.service) {
      formats.push(winston.format((info) => {
        info.service = this.name;
        info.version = this.version;
        return info;
      })());
    }

    switch (this.config.format) {
      case 'json':
        formats.push(winston.format.json());
        break;
      case 'pretty':
        formats.push(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...metadata }) => {
            let msg = `${timestamp} [${level}]: ${message}`;
            if (Object.keys(metadata).length > 0) {
              msg += '\n' + JSON.stringify(metadata, null, 2);
            }
            return msg;
          })
        );
        break;
      case 'simple':
        formats.push(winston.format.simple());
        break;
    }

    return winston.format.combine(...formats);
  }

  private createTransports(): winston.transport[] {
    const transports: winston.transport[] = [];

    if (this.config.console.enabled) {
      transports.push(new winston.transports.Console({
        level: this.config.console.level || this.config.level
      }));
    }

    if (this.config.file.enabled) {
      const { filename, maxSize, maxFiles, level } = this.config.file;
      transports.push(new winston.transports.File({
        filename,
        maxsize: maxSize,
        maxFiles,
        level: level || this.config.level,
        tailable: true
      }));
    }

    return transports;
  }

  async getHealth(): Promise<ServiceHealth> {
    try {
      const logStats = await this.getLogStats();
      
      return {
        status: ServiceStatus.HEALTHY,
        version: this.version,
        details: {
          level: this.config.level,
          format: this.config.format,
          transports: {
            console: this.config.console.enabled,
            file: this.config.file.enabled
          },
          metrics: {
            entries: await this.logEntries.get(),
            errors: await this.logErrors.get(),
            warnings: await this.logWarnings.get(),
            logFileSize: logStats.size
          },
          configuration: this.config
        }
      };
    } catch (error) {
      return {
        status: ServiceStatus.DEGRADED,
        version: this.version,
        details: {
          error: String(error)
        }
      };
    }
  }

  private async getLogStats(): Promise<{ size: number }> {
    try {
      if (this.config.file.enabled) {
        const stats = await fs.stat(this.config.file.filename.replace('%DATE%', new Date().toISOString().split('T')[0]));
        this.logFileSize.set(stats.size);
        return { size: stats.size };
      }
      return { size: 0 };
    } catch (error) {
      this.warn('Could not retrieve log file stats', { error });
      return { size: 0 };
    }
  }

  private logWithLatency(level: string, message: string, metadata?: LogMetadata): void {
    const startTime = process.hrtime();

    try {
      this.winstonLogger[level](message, this.enrichMetadata(metadata));
      this.logEntries.inc({ level });

      if (level === 'error') {
        this.logErrors.inc({
          type: metadata?.error instanceof Error ? metadata.error.name : 'unknown'
        });
      } else if (level === 'warn') {
        this.logWarnings.inc();
      }
    } finally {
      const [seconds, nanoseconds] = process.hrtime(startTime);
      this.loggingLatency.observe(seconds + nanoseconds / 1e9);
    }
  }

  private enrichMetadata(metadata: LogMetadata = {}): LogMetadata {
    const enriched: LogMetadata = { ...metadata };

    if (this.config.metadata.service) {
      enriched.service = this.name;
    }

    if (this.config.metadata.timestamp) {
      enriched.timestamp = new Date().toISOString();
    }

    return enriched;
  }

  error(message: string, metadata?: LogMetadata): void {
    this.logWithLatency('error', message, metadata);
  }

  warn(message: string, metadata?: LogMetadata): void {
    this.logWithLatency('warn', message, metadata);
  }

  info(message: string, metadata?: LogMetadata): void {
    this.logWithLatency('info', message, metadata);
  }

  http(message: string, metadata?: LogMetadata): void {
    this.logWithLatency('http', message, metadata);
  }

  verbose(message: string, metadata?: LogMetadata): void {
    this.logWithLatency('verbose', message, metadata);
  }

  debug(message: string, metadata?: LogMetadata): void {
    this.logWithLatency('debug', message, metadata);
  }

  silly(message: string, metadata?: LogMetadata): void {
    this.logWithLatency('silly', message, metadata);
  }
}

export default LoggingManager.getInstance();
