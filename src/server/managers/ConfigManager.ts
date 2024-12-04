import { Counter, Gauge, Histogram, Registry } from 'prom-client';
import { z } from 'zod';
import { BaseService, ServiceConfig } from '../services/base.service';
import { LoggingManager } from './LoggingManager';
import { MetricsManager } from './MetricsManager';
import { BaseManagerDependencies } from './ManagerContainer';
import { ServiceHealth } from '../../types/service';
import { JsonValue } from './types/manager.types';
import {
  BaseConfig,
  ConfigSource,
  ConfigSourceType,
  ConfigOperationResult,
  BaseConfigSchema
} from './config/types';
import { ConfigSourceLoader } from './config/sources';

const CONFIG_SERVICE_CONFIG: ServiceConfig = {
  retryOptions: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 5000,
    factor: 2,
    timeout: 30000
  },
  cacheOptions: {
    ttl: 300,
    prefix: 'config:'
  },
  metricsEnabled: true,
  loggingEnabled: true,
  validation: {
    strict: true
  }
};

const DEFAULT_CONFIG: BaseConfig = {
  server: {
    port: 3000,
    host: 'localhost',
    environment: 'development',
    debug: false
  },
  logging: {
    level: 'info',
    format: 'json',
    enabled: true
  },
  metrics: {
    enabled: true,
    interval: 10000
  },
  security: {
    rateLimiting: {
      enabled: true,
      maxRequests: 100,
      windowMs: 15000
    },
    cors: {
      enabled: true,
      origins: ['*']
    }
  }
};

export class ConfigManager extends BaseService {
  private static instance: ConfigManager;
  private appConfig: BaseConfig;
  private configSources: ConfigSource[] = [];
  private metricsManager?: MetricsManager;
  private loggingManager?: LoggingManager;
  private metricsRegistry: Registry;

  // Metrics
  private configValidationErrors?: Counter<string>;
  private configSourceErrors?: Counter<string>;
  private configSourcesTotal?: Gauge<string>;
  private configOperationDuration?: Histogram<string>;

  private constructor() {
    super(CONFIG_SERVICE_CONFIG);
    this.metricsRegistry = new Registry();
    this.appConfig = structuredClone(DEFAULT_CONFIG);
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  async initialize(deps: BaseManagerDependencies): Promise<void> {
    try {
      if (!deps.loggingManager || !deps.metricsManager) {
        throw new Error('Required dependencies not provided');
      }

      this.loggingManager = deps.loggingManager;
      this.metricsManager = deps.metricsManager;

      this.initializeMetrics();

      await Promise.all([
        this.initializeSources(),
        this.validateConfig()
      ]);

      this.loggingManager.info('ConfigManager initialized successfully', {
        sourceCount: this.configSources.length
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.loggingManager?.error('Failed to initialize ConfigManager', { error: errorMessage });
      this.configSourceErrors?.inc({ type: 'initialization' });
      throw new Error(`ConfigManager initialization failed: ${errorMessage}`);
    }
  }

  private initializeMetrics(): void {
    try {
      if (!this.metricsManager) {
        throw new Error('MetricsManager not available');
      }

      this.configValidationErrors = new Counter({
        name: 'config_validation_errors_total',
        help: 'Total number of configuration validation errors',
        labelNames: ['type'],
        registers: [this.metricsRegistry]
      });

      this.configSourceErrors = new Counter({
        name: 'config_source_errors_total',
        help: 'Total number of configuration source errors',
        labelNames: ['type'],
        registers: [this.metricsRegistry]
      });

      this.configSourcesTotal = new Gauge({
        name: 'config_sources_total',
        help: 'Total number of configuration sources',
        registers: [this.metricsRegistry]
      });

      this.configOperationDuration = new Histogram({
        name: 'config_operation_duration_seconds',
        help: 'Duration of configuration operations',
        buckets: [0.001, 0.01, 0.1, 0.5, 1],
        registers: [this.metricsRegistry]
      });

      this.configSourcesTotal.set(this.configSources.length);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.loggingManager?.warn('Failed to initialize config metrics', { error: errorMessage });
    }
  }

  private async initializeSources(): Promise<void> {
    try {
      const sources = await ConfigSourceLoader.loadSources();
      this.configSources = sources;
      this.configSourcesTotal?.set(this.configSources.length);

      // Merge sources into appConfig
      for (const source of this.configSources) {
        this.appConfig = this.mergeConfigs(this.appConfig, source.data);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.loggingManager?.error('Failed to initialize config sources', { error: errorMessage });
      this.configSourceErrors?.inc({ type: 'source_loading' });
      throw new Error(`Config source initialization failed: ${errorMessage}`);
    }
  }

  private mergeConfigs(target: BaseConfig, source: Record<string, unknown>): BaseConfig {
    const merged = structuredClone(target);

    // Helper function to type-check and merge nested objects
    const mergeNestedObject = <T extends Record<string, unknown>>(
      targetObj: T,
      sourceObj: unknown
    ): T => {
      if (!sourceObj || typeof sourceObj !== 'object') {
        return targetObj;
      }

      const result = { ...targetObj };
      for (const [key, value] of Object.entries(sourceObj)) {
        if (key in targetObj) {
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            result[key as keyof T] = mergeNestedObject(
              targetObj[key as keyof T] as Record<string, unknown>,
              value
            ) as T[keyof T];
          } else {
            result[key as keyof T] = value as T[keyof T];
          }
        }
      }
      return result;
    };

    // Merge each top-level section
    if (source.server) {
      merged.server = mergeNestedObject(merged.server, source.server);
    }
    if (source.logging) {
      merged.logging = mergeNestedObject(merged.logging, source.logging);
    }
    if (source.metrics) {
      merged.metrics = mergeNestedObject(merged.metrics, source.metrics);
    }
    if (source.security) {
      merged.security = mergeNestedObject(merged.security, source.security);
    }

    return merged;
  }

  private async validateConfig(): Promise<void> {
    try {
      const validationStart = Date.now();
      const result = await BaseConfigSchema.safeParseAsync(this.appConfig);

      if (!result.success) {
        this.configValidationErrors?.inc({ 
          type: result.error.issues[0]?.path[0]?.toString() || 'unknown' 
        });

        this.loggingManager?.error('Configuration validation failed', {
          errors: result.error.issues.map(issue => ({
            path: issue.path,
            message: issue.message
          }))
        });

        throw new Error('Invalid configuration');
      }

      const duration = (Date.now() - validationStart) / 1000;
      this.configOperationDuration?.observe(duration);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.loggingManager?.error('Configuration validation error', { error: errorMessage });
      throw new Error(`Config validation failed: ${errorMessage}`);
    }
  }

  public getConfig<T extends JsonValue>(key: string, defaultValue: T): T {
    const value = ConfigSourceLoader.getNestedValue(this.appConfig, key);
    return value === undefined || value === null ? defaultValue : value as T;
  }

  public get<T extends JsonValue>(key: string, defaultValue?: T): ConfigOperationResult<T> {
    const startTime = Date.now();
    try {
      const value = ConfigSourceLoader.getNestedValue(this.appConfig, key);
      
      if (value === undefined || value === null) {
        if (defaultValue !== undefined) {
          return {
            success: true,
            data: defaultValue,
            metadata: {
              source: ConfigSourceType.DEFAULT,
              timestamp: new Date()
            }
          };
        }

        return {
          success: false,
          error: {
            path: [key],
            value: null,
            message: `Configuration key not found: ${key}`
          },
          metadata: {
            source: ConfigSourceType.DEFAULT,
            timestamp: new Date()
          }
        };
      }

      return {
        success: true,
        data: value as T,
        metadata: {
          source: this.getValueSource(key),
          timestamp: new Date()
        }
      };
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      this.configOperationDuration?.observe(duration);
    }
  }

  private getValueSource(key: string): ConfigSourceType {
    for (const source of this.configSources) {
      const value = ConfigSourceLoader.getNestedValue(source.data, key);
      if (value !== undefined && value !== null) {
        return source.type;
      }
    }
    return ConfigSourceType.DEFAULT;
  }

  public getHealth(): ServiceHealth {
    return {
      status: 'healthy',
      details: {
        metrics: {
          status: this.metricsRegistry ? 'available' : 'unavailable',
          lastUpdate: new Date()
        },
        resources: {
          memory: process.memoryUsage().heapUsed,
          cpu: process.cpuUsage().system,
          connections: this.configSources.length
        }
      },
      lastCheck: new Date()
    };
  }

  public async cleanup(): Promise<void> {
    try {
      await Promise.all([
        Promise.resolve(this.configSources = []),
        Promise.resolve(this.metricsRegistry.clear()),
        Promise.resolve(this.appConfig = structuredClone(DEFAULT_CONFIG))
      ]);
      this.loggingManager?.info('ConfigManager cleaned up successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.loggingManager?.error('Failed to cleanup ConfigManager', { error: errorMessage });
      throw new Error(`ConfigManager cleanup failed: ${errorMessage}`);
    }
  }
}
