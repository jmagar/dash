import { z } from 'zod';
import { config as dotenvConfig } from 'dotenv';
import { logger } from '../logger';
import { LoggingManager } from '../../../../../../../../../../utils/logging/LoggingManager';

dotenvConfig();

export class ConfigManager {
  private static instance: ConfigManager;
  private config: Record<string, any> = {};
  private schemas: Record<string, z.ZodType> = {};

  private constructor() {
    // Private to enforce singleton
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Register a configuration schema
   */
  public registerSchema(namespace: string, schema: z.ZodType): void {
    if (this.schemas[namespace]) {
      throw new Error(`Schema for namespace ${namespace} already exists`);
    }
    this.schemas[namespace] = schema;
  }

  /**
   * Load and validate configuration for a namespace
   */
  public loadConfig<T>(namespace: string, data: unknown): T {
    const schema = this.schemas[namespace];
    if (!schema) {
      throw new Error(`No schema registered for namespace ${namespace}`);
    }

    try {
      const validatedConfig = schema.parse(data);
      this.config[namespace] = validatedConfig;
      return validatedConfig as T;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message
        }));
        loggerLoggingManager.getInstance().();
      }
      throw error;
    }
  }

  /**
   * Get configuration value
   */
  public get<T>(path: string): T {
    const [namespace, ...keys] = path.split('.');
    const namespaceConfig = this.config[namespace];

    if (!namespaceConfig) {
      throw new Error(`Configuration namespace ${namespace} not found`);
    }

    return keys.reduce((obj, key) => obj?.[key], namespaceConfig) as T;
  }

  /**
   * Get environment variable with validation
   */
  public getEnvVar(key: string, defaultValue?: string): string {
    const value = process.env[key] ?? defaultValue;
    
    if (value === undefined) {
      throw new Error(`Required environment variable ${key} is not set`);
    }

    return value;
  }

  /**
   * Parse number from environment variable
   */
  public parseNumber(
    value: string | undefined,
    defaultValue: number,
    min?: number,
    max?: number
  ): number {
    const parsed = value ? parseInt(value, 10) : defaultValue;

    if (isNaN(parsed)) {
      return defaultValue;
    }

    if (min !== undefined && parsed < min) {
      return min;
    }

    if (max !== undefined && parsed > max) {
      return max;
    }

    return parsed;
  }

  /**
   * Load environment variables with schema validation
   */
  public loadEnvConfig<T>(schema: z.ZodType<T>): T {
    const envConfig: Record<string, unknown> = {};

    // Get all environment variables
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        envConfig[key] = value;
      }
    }

    try {
      return schema.parse(envConfig);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message
        }));
        loggerLoggingManager.getInstance().();
      }
      throw error;
    }
  }
}

