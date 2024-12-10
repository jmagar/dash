import { z } from 'zod';
import * as winston from 'winston';
import { BaseService } from '../services/base-service';
import { LogLevel } from '../../types/logger';
import { ServiceConfig } from '../../types/config';
import { ConfigManager } from './ConfigManager';
import { MetricsManager } from './MetricsManager';

// Zod schema for logging configuration
const LoggingConfigSchema = z.object({
  metadata: z.object({
    userId: z.boolean().default(true),
    service: z.boolean().default(true),
    timestamp: z.boolean().default(true),
    requestId: z.boolean().default(true)
  }),
  level: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('info'),
  format: z.enum(['json', 'simple', 'pretty']).default('json'),
  console: z.object({
    enabled: z.boolean().default(true),
    level: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).optional()
  }).default({}),
  file: z.object({
    filename: z.string(),
    enabled: z.boolean().default(true),
    maxSize: z.number().min(1).max(50).default(10),
    maxFiles: z.number().min(1).max(30).default(7),
    level: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).optional()
  }).default({ filename: 'logs/app.log' })
});

type LoggingConfig = z.infer<typeof LoggingConfigSchema>;

interface LoggerConfig extends ServiceConfig {
  logging: LoggingConfig;
}

export class LoggingManager extends BaseService {
  private static instance: LoggingManager;
  private winstonLogger: winston.Logger;
  private config: LoggerConfig;
  private metricsManager: MetricsManager;
  private initialized = false;

  constructor(configManager: ConfigManager, metricsManager: MetricsManager) {
    super();
    this.metricsManager = metricsManager;
    this.config = {
      name: 'logging',
      version: '1.0.0',
      dependencies: ['config', 'metrics'],
      logging: LoggingConfigSchema.parse(configManager.getConfig('logging'))
    };

    // Initialize a default console logger until proper initialization
    this.winstonLogger = winston.createLogger({
      level: 'info',
      format: winston.format.simple(),
      transports: [new winston.transports.Console()]
    });
  }

  public static getInstance(): LoggingManager {
    if (!LoggingManager.instance) {
      const configManager = ConfigManager.getInstance();
      const metricsManager = MetricsManager.getInstance();
      LoggingManager.instance = new LoggingManager(configManager, metricsManager);
    }
    return LoggingManager.instance;
  }

  protected async onStart(): Promise<void> {
    if (this.initialized) return;

    try {
      const rawConfig = ConfigManager.getInstance().get('logging');
      this.config = {
        name: 'logging',
        version: '1.0.0',
        dependencies: ['config', 'metrics'],
        logging: LoggingConfigSchema.parse(rawConfig)
      };

      const transports: winston.transport[] = [];

      // Console transport
      if (this.config.logging.console.enabled) {
        transports.push(new winston.transports.Console({
          level: this.config.logging.console.level || this.config.logging.level,
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }));
      }

      // File transport
      if (this.config.logging.file.enabled) {
        transports.push(new winston.transports.File({
          filename: this.config.logging.file.filename,
          level: this.config.logging.file.level || this.config.logging.level,
          maxsize: this.config.logging.file.maxSize * 1024 * 1024,
          maxFiles: this.config.logging.file.maxFiles,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        }));
      }

      this.winstonLogger = winston.createLogger({
        level: this.config.logging.level,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        defaultMeta: {
          service: this.config.name,
          version: this.config.version
        },
        transports
      });

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize logger:', error);
      throw error;
    }
  }

  protected async onStop(): Promise<void> {
    if (!this.initialized) return;

    await new Promise<void>((resolve) => {
      this.winstonLogger.on('finish', () => resolve());
      this.winstonLogger.end();
    });
    this.initialized = false;
  }

  public async cleanup(): Promise<void> {
    await this.onStop();
  }

  // Logging methods
  public error(message: string, metadata?: Record<string, unknown>): void {
    this.winstonLogger.error(message, metadata);
  }

  public warn(message: string, metadata?: Record<string, unknown>): void {
    this.winstonLogger.warn(message, metadata);
  }

  public info(message: string, metadata?: Record<string, unknown>): void {
    this.winstonLogger.info(message, metadata);
  }

  public debug(message: string, metadata?: Record<string, unknown>): void {
    this.winstonLogger.debug(message, metadata);
  }

  public http(message: string, metadata?: Record<string, unknown>): void {
    this.winstonLogger.http(message, metadata);
  }

  public verbose(message: string, metadata?: Record<string, unknown>): void {
    this.winstonLogger.verbose(message, metadata);
  }

  public silly(message: string, metadata?: Record<string, unknown>): void {
    this.winstonLogger.silly(message, metadata);
  }
}

export default LoggingManager.getInstance();

