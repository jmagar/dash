import { z } from 'zod';
import { JsonValue, JsonObject } from '../types/manager.types';

// Configuration schemas
export const ServerConfigSchema = z.object({
  port: z.number().int().min(1).max(65535).default(3000),
  host: z.string().default('localhost'),
  environment: z.enum(['development', 'production', 'test']).default('development'),
  debug: z.boolean().default(false)
}).strict();

export const LoggingConfigSchema = z.object({
  level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  format: z.enum(['json', 'simple']).default('json'),
  enabled: z.boolean().default(true)
}).strict();

export const MetricsConfigSchema = z.object({
  enabled: z.boolean().default(true),
  interval: z.number().int().min(1000).max(300000).default(10000)
}).strict();

export const SecurityConfigSchema = z.object({
  rateLimiting: z.object({
    enabled: z.boolean().default(true),
    maxRequests: z.number().int().min(1).max(1000).default(100),
    windowMs: z.number().int().min(1000).max(60000).default(15000)
  }),
  cors: z.object({
    enabled: z.boolean().default(true),
    origins: z.array(z.string()).default(['*'])
  })
}).strict();

export const BaseConfigSchema = z.object({
  server: ServerConfigSchema,
  logging: LoggingConfigSchema,
  metrics: MetricsConfigSchema,
  security: SecurityConfigSchema
}).strict();

// Type definitions
export type ServerConfig = z.infer<typeof ServerConfigSchema>;
export type LoggingConfig = z.infer<typeof LoggingConfigSchema>;
export type MetricsConfig = z.infer<typeof MetricsConfigSchema>;
export type SecurityConfig = z.infer<typeof SecurityConfigSchema>;
export type BaseConfig = z.infer<typeof BaseConfigSchema>;

export enum ConfigSourceType {
  ENV = 'env',
  FILE = 'file',
  DEFAULT = 'default',
  OVERRIDE = 'override'
}

export interface ConfigSource {
  readonly type: ConfigSourceType;
  readonly priority: number;
  data: JsonObject;
}

export interface ConfigValidationError {
  readonly path: string[];
  readonly value: JsonValue;
  readonly message: string;
}

export interface ConfigOperationResult<T extends JsonValue = JsonValue> {
  success: boolean;
  data?: T;
  error?: ConfigValidationError;
  metadata: {
    source: ConfigSourceType;
    timestamp: Date;
  };
}
