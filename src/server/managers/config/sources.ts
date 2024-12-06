import { promises as fs } from 'fs';
import path from 'path';
import * as yaml from 'js-yaml';
import { JsonObject, JsonValue } from '../types/manager.types';
import { ConfigSource, ConfigSourceType, BaseConfigSchema } from './types';

export class ConfigSourceLoader {
  /**
   * Load configuration from environment variables
   */
  static loadEnvConfig(): JsonObject {
    const config: JsonObject = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (!value) continue;
      const pathParts = key.toLowerCase().split('_');
      let current = config;
      
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (!part) continue;
        if (!(part in current)) {
          current[part] = {};
        }
        current = current[part] ;
      }
      
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart) {
        current[lastPart] = value;
      }
    }
    return config;
  }

  /**
   * Load configuration from a file
   */
  static async loadConfigFile(filePath: string): Promise<JsonObject> {
    const content = await fs.readFile(filePath, 'utf8');
    const extension = path.extname(filePath).toLowerCase();

    switch (extension) {
      case '.json':
        return JSON.parse(content) as JsonObject;
      case '.yaml':
      case '.yml':
        return yaml.load(content) as JsonObject;
      default:
        throw new Error(`Unsupported configuration file type: ${extension}`);
    }
  }

  /**
   * Get default configuration
   */
  static getDefaultConfig(): JsonObject {
    const defaultConfig = BaseConfigSchema.parse({
      server: {},
      logging: {},
      metrics: {},
      security: {}
    });
    return defaultConfig;
  }

  /**
   * Check if a file exists
   */
  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Load all configuration sources
   */
  static async loadSources(): Promise<ConfigSource[]> {
    const sources: ConfigSource[] = [];

    // Environment variables
    sources.push({
      type: ConfigSourceType.ENV,
      priority: 100,
      data: this.loadEnvConfig()
    });

    // Configuration files
    const configFiles = ['config.yaml', 'config.json'];
    for (const file of configFiles) {
      const configPath = path.join(process.cwd(), file);
      if (await this.fileExists(configPath)) {
        const fileConfig = await this.loadConfigFile(configPath);
        sources.push({
          type: ConfigSourceType.FILE,
          priority: 50,
          data: fileConfig
        });
      }
    }

    // Default values
    sources.push({
      type: ConfigSourceType.DEFAULT,
      priority: 0,
      data: this.getDefaultConfig()
    });

    // Sort sources by priority (highest first)
    return sources.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Merge multiple configuration sources
   */
  static mergeConfigs(sources: ConfigSource[]): JsonObject {
    const merged: JsonObject = {};
    for (const source of sources) {
      this.deepMerge(merged, source.data);
    }
    return merged;
  }

  /**
   * Deep merge two objects
   */
  private static deepMerge(target: JsonObject, source: JsonObject): void {
    for (const key in source) {
      const value = source[key];
      if (value === null) {
        target[key] = null;
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        if (!(key in target)) {
          target[key] = {};
        }
        const targetValue = target[key];
        if (targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)) {
          this.deepMerge(targetValue, value);
        }
      } else if (value !== undefined) {
        target[key] = value;
      }
    }
  }

  /**
   * Get a nested value from an object
   */
  static getNestedValue(obj: JsonObject, path: string): JsonValue | null {
    const parts = path.split('.');
    let current: JsonObject = obj;

    for (const part of parts) {
      if (!part || !current) {
        return null;
      }

      // Type guard to ensure current is an object
      if (typeof current !== 'object' || Array.isArray(current)) {
        return null;
      }

      // Safe access with type checking
      const nextValue = current[part];
      if (nextValue === undefined) {
        return null;
      }

      // Update current for next iteration
      if (typeof nextValue === 'object' && !Array.isArray(nextValue)) {
        current = nextValue as JsonObject;
      } else {
        return nextValue as JsonValue;
      }
    }

    return current as JsonValue;
  }
}
