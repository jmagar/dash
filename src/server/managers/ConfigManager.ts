import { z } from 'zod';
import { config as dotenvConfig } from 'dotenv';
import { BaseService } from '../services/base.service';
import { LoggingManager } from './LoggingManager';
import { MetricsManager } from './MetricsManager';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';

dotenvConfig();

// Base Configuration Schema
const BaseConfigSchema = z.object({
  server: z.object({
    port: z.number().int().min(1).max(65535).default(3000),
    host: z.string().default('localhost'),
    environment: z.enum(['development', 'production', 'test']).default('development'),
    debug: z.boolean().default(false)
  }),
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    format: z.enum(['json', 'simple']).default('json'),
    enabled: z.boolean().default(true)
  }),
  metrics: z.object({
    enabled: z.boolean().default(true),
    interval: z.number().int().min(1000).max(300000).default(10000)
  }),
  security: z.object({
    rateLimiting: z.object({
      enabled: z.boolean().default(true),
      maxRequests: z.number().int().min(1).max(1000).default(100),
      windowMs: z.number().int().min(1000).max(60000).default(15000)
    }),
    cors: z.object({
      enabled: z.boolean().default(true),
      origins: z.array(z.string()).default(['*'])
    })
  })
}).strict();

// Configuration Source Interface
interface ConfigSource {
  type: 'env' | 'file' | 'memory';
  priority: number;
  data: Record<string, any>;
}

export class ConfigManager extends BaseService {
  private static instance: ConfigManager;
  private config: z.infer<typeof BaseConfigSchema>;
  private sources: ConfigSource[] = [];
  private customSchemas: Record<string, z.ZodType> = {};

  private constructor(
    private logger: LoggingManager,
    private metrics: MetricsManager
  ) {
    super({
      name: 'ConfigManager',
      version: '1.0.0',
      dependencies: ['LoggingManager', 'MetricsManager']
    });

    this.initializeSources();
  }

  public static getInstance(
    logger: LoggingManager,
    metrics: MetricsManager
  ): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager(logger, metrics);
    }
    return ConfigManager.instance;
  }

  private setupErrorHandling(): void {
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled Rejection in ConfigManager', { 
        reason, 
        promise 
      });
      this.metrics.incrementCounter('config_unhandled_rejections_total');
    });

    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught Exception in ConfigManager', { error });
      this.metrics.incrementCounter('config_uncaught_exceptions_total');
    });
  }

  private initializeMetrics(): void {
    this.metrics.createCounter('config_updates_total', 'Total number of configuration updates', ['source']);
    this.metrics.createGauge('active_configs', 'Number of active configuration keys', ['type']);
    this.metrics.createCounter('config_validation_errors_total', 'Total number of configuration validation errors', ['schema']);
    this.metrics.createGauge('config_size_bytes', 'Size of configuration in bytes');
    this.metrics.createCounter('config_unhandled_rejections_total', 'Total unhandled rejections');
    this.metrics.createCounter('config_uncaught_exceptions_total', 'Total uncaught exceptions');
  }

  private initializeSources(): void {
    // Environment variables (highest priority)
    this.sources.push({
      type: 'env',
      priority: 3,
      data: { ...process.env }
    });

    // Memory store (medium priority)
    this.sources.push({
      type: 'memory',
      priority: 2,
      data: {}
    });

    // Default values (lowest priority)
    this.sources.push({
      type: 'memory',
      priority: 1,
      data: BaseConfigSchema.parse({})
    });
  }

  async init(): Promise<void> {
    try {
      this.setupErrorHandling();
      this.initializeMetrics();

      // Load configuration files if they exist
      await this.loadConfigFiles();
      
      // Merge all sources based on priority
      this.mergeConfigSources();
      
      // Validate final configuration
      this.config = BaseConfigSchema.parse(this.config);
      
      // Update metrics
      this.updateMetrics();
      
      this.logger.info('ConfigManager initialized successfully', {
        sourceCount: this.sources.length,
        environment: this.config.server.environment
      });
    } catch (error) {
      this.logger.error('Failed to initialize ConfigManager', { error });
      throw error;
    }
  }

  public async cleanup(): Promise<void> {
    try {
      // Clear memory sources
      this.sources = this.sources.filter(source => source.type !== 'memory');
      this.config = BaseConfigSchema.parse({});
      
      this.logger.info('ConfigManager cleaned up successfully');
    } catch (error) {
      this.logger.error('Error during ConfigManager cleanup', { error });
      throw error;
    }
  }

  public async getHealth(): Promise<{ 
    status: 'healthy' | 'unhealthy' | 'degraded'; 
    details?: Record<string, unknown>; 
  }> {
    try {
      return {
        status: 'healthy',
        details: {
          sources: this.sources.length,
          environment: this.config.server.environment,
          debug: this.config.server.debug
        }
      };
    } catch (error) {
      this.logger.error('ConfigManager health check failed', { error });
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  private async loadConfigFiles(): Promise<void> {
    const configFiles = [
      { path: 'config.yaml', required: false },
      { path: `config.${process.env.NODE_ENV}.yaml`, required: false }
    ];

    for (const file of configFiles) {
      try {
        const configPath = path.resolve(process.cwd(), file.path);
        const exists = await fs.access(configPath).then(() => true).catch(() => false);
        
        if (exists) {
          const content = await fs.readFile(configPath, 'utf8');
          const data = yaml.load(content) as Record<string, any>;
          
          this.sources.push({
            type: 'file',
            priority: 2,
            data
          });
          
          this.metrics.incrementCounter('config_updates_total', { source: 'file' });
        } else if (file.required) {
          throw new Error(`Required config file ${file.path} not found`);
        }
      } catch (error) {
        if (file.required) {
          throw error;
        }
        this.logger.warn(`Failed to load config file: ${file.path}`, { error });
      }
    }
  }

  private mergeConfigSources(): void {
    // Sort sources by priority (highest first)
    const sortedSources = [...this.sources].sort((a, b) => b.priority - a.priority);
    
    // Merge sources
    let mergedConfig: Record<string, any> = {};
    for (const source of sortedSources) {
      mergedConfig = this.deepMerge(mergedConfig, source.data);
    }

    this.config = mergedConfig;
  }

  private deepMerge(target: any, source: any): any {
    if (typeof source !== 'object' || source === null) {
      return source;
    }

    const output = { ...target };
    
    for (const key in source) {
      if (typeof source[key] === 'object' && source[key] !== null) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = this.deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    }

    return output;
  }

  private updateMetrics(): void {
    try {
      const configSize = Buffer.byteLength(JSON.stringify(this.config));
      
      this.metrics.setGauge('config_size_bytes', configSize);
      this.metrics.setGauge('active_configs', Object.keys(this.config).length, { type: 'total' });
    } catch (error) {
      this.logger.warn('Failed to update config metrics', { error });
    }
  }

  public registerSchema<T extends z.ZodType>(
    key: string, 
    schema: T
  ): void {
    if (this.customSchemas[key]) {
      this.logger.warn(`Schema for ${key} already exists. Overwriting.`);
    }
    this.customSchemas[key] = schema;
  }

  public get<T = any>(
    key?: string, 
    defaultValue?: T
  ): T {
    try {
      if (!key) return this.config as T;

      const keys = key.split('.');
      let value = this.config as any;

      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          return defaultValue as T;
        }
      }

      // If a custom schema is registered for this key, validate
      const schemaKey = keys[0];
      if (this.customSchemas[schemaKey]) {
        try {
          return this.customSchemas[schemaKey].parse(value);
        } catch (validationError) {
          this.metrics.incrementCounter('config_validation_errors_total', { schema: schemaKey });
          this.logger.error('Config validation failed', { 
            key, 
            error: validationError 
          });
          return defaultValue as T;
        }
      }

      return value;
    } catch (error) {
      this.logger.error('Error retrieving config', { key, error });
      return defaultValue as T;
    }
  }

  public set(key: string, value: any): void {
    try {
      const keys = key.split('.');
      let current = this.config as any;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in current)) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
      
      this.metrics.incrementCounter('config_updates_total', { source: 'memory' });
      this.updateMetrics();
    } catch (error) {
      this.logger.error('Error setting config', { key, error });
    }
  }
}
