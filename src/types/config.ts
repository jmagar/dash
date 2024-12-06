import { ChatModel, type ChatModelConfig } from './chat';

// Environment type
export type Environment = 'development' | 'production' | 'test';

// Log level type
export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

// Process sort options
export type ProcessSortField = 'cpu' | 'memory' | 'pid' | 'name';
export type SortOrder = 'asc' | 'desc';

// Server configuration
export interface ServerConfig {
  env: Environment;
  host: string;
  port: number;
  baseUrl: string;
  maxRequestSize: number;
  cors: CorsConfig;
  rateLimit: RateLimitConfig;
  security: SecurityConfig;
  redis: RedisConfig;
  logging: LoggingConfig;
  monitoring: MonitoringConfig;
  process: ProcessConfig;
}

export interface CorsConfig {
  origin: string;
  methods: string[];
  allowedHeaders: string;
  exposedHeaders: string;
  credentials: boolean;
  maxAge: number;
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
}

export interface SecurityConfig {
  jwtSecret: string;
  refreshSecret: string;
  tokenExpiration: string;
  refreshExpiration: string;
  sessionMaxAge: number;
  maxFileSize: number;
  tokenRefreshInterval: number;
}

export interface MonitoringConfig {
  enabled: boolean;
  interval: number;
  metricsPath: string;
}

export interface ProcessConfig {
  monitorInterval: number;
  maxMonitoredHosts: number;
  includeChildren: boolean;
  excludeSystemProcesses: boolean;
  sortBy: ProcessSortField;
  sortOrder: SortOrder;
  maxProcesses: number;
}

// Database configuration
export interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
}

// JWT configuration
export interface JwtConfig {
  secret: string;
  expiry: string;
  refreshExpiry: string;
}

// AI service configurations
export interface OpenAIConfig {
  apiKey?: string;
  model: string;
  org?: string;
  maxTokens: number;
  temperature: number;
}

export interface OpenRouterConfig {
  apiKey?: string;
  model: string;
  baseUrl: string;
  maxTokens: number;
  temperature: number;
}

// Chat configuration
export interface ChatConfig {
  model: ChatModel;
  defaultConfig: ChatModelConfig;
  rateLimit?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  contextWindow?: number;
  systemPrompt?: string;
}

// Notification configuration
export interface GotifyConfig {
  url?: string;
  token?: string;
}

// Logging configuration
export interface LoggingConfig {
  level: LogLevel;
  format: string;
  dir: string;
  maxFiles: number;
  maxSize: string;
}

// Redis configuration
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
}

// Root configuration
export interface Config {
  server: ServerConfig;
  db: DatabaseConfig;
  jwt: JwtConfig;
  openai: OpenAIConfig;
  openrouter: OpenRouterConfig;
  gotify: GotifyConfig;
  logging: LoggingConfig;
  redis: RedisConfig;
  paths: {
    binaries: string;
  };
  process: {
    env: string;
  };
  chatModel: ChatConfig;
}

// Default values
export const DEFAULT_CONFIG: Partial<Config> = {
  server: {
    env: 'development',
    host: 'localhost',
    port: 3000,
    baseUrl: 'http://localhost:3000',
    maxRequestSize: 10 * 1024 * 1024, // 10MB
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: '*',
      exposedHeaders: '*',
      credentials: true,
      maxAge: 86400
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100
    },
    security: {
      jwtSecret: 'default-jwt-secret',
      refreshSecret: 'default-refresh-secret',
      tokenExpiration: '1h',
      refreshExpiration: '7d',
      sessionMaxAge: 86400000, // 24 hours
      maxFileSize: 50 * 1024 * 1024, // 50MB
      tokenRefreshInterval: 300000 // 5 minutes
    },
    redis: {
      host: 'localhost',
      port: 6379,
      db: 0
    },
    logging: {
      level: 'info',
      format: 'json',
      dir: './logs',
      maxFiles: 10,
      maxSize: '10m'
    },
    monitoring: {
      enabled: true,
      interval: 60000, // 1 minute
      metricsPath: '/metrics'
    },
    process: {
      monitorInterval: 5000, // 5 seconds
      maxMonitoredHosts: 10,
      includeChildren: true,
      excludeSystemProcesses: true,
      sortBy: 'cpu',
      sortOrder: 'desc',
      maxProcesses: 100
    }
  },
  logging: {
    level: 'info',
    format: 'json',
    dir: './logs',
    maxFiles: 10,
    maxSize: '10m'
  },
  redis: {
    host: 'localhost',
    port: 6379,
    db: 0
  },
  paths: {
    binaries: './bin'
  },
  process: {
    env: 'development'
  },
  chatModel: {
    model: ChatModel.GPT4,
    defaultConfig: {
      model: ChatModel.GPT4,
      temperature: 0.7,
      maxTokens: 2000,
      topP: 1,
      presencePenalty: 0,
      frequencyPenalty: 0,
      stream: false
    },
    rateLimit: {
      requestsPerMinute: 60,
      tokensPerMinute: 100000
    },
    contextWindow: 8192,
    systemPrompt: 'You are a helpful assistant.'
  }
} as const;

// Type guards
export function isEnvironment(value: unknown): value is Environment {
  return typeof value === 'string' && ['development', 'production', 'test'].includes(value);
}

export function isLogLevel(value: unknown): value is LogLevel {
  return typeof value === 'string' && ['error', 'warn', 'info', 'debug', 'trace'].includes(value);
}

export function isProcessSortField(value: unknown): value is ProcessSortField {
  return typeof value === 'string' && ['cpu', 'memory', 'pid', 'name'].includes(value);
}

export function isSortOrder(value: unknown): value is SortOrder {
  return typeof value === 'string' && ['asc', 'desc'].includes(value);
}

// Validation functions
export function validateConfig(config: unknown): config is Config {
  if (!config || typeof config !== 'object') return false;
  
  const c = config as Config;
  return (
    typeof c.server === 'object' &&
    typeof c.db === 'object' &&
    typeof c.jwt === 'object' &&
    typeof c.openai === 'object' &&
    typeof c.openrouter === 'object' &&
    typeof c.logging === 'object' &&
    typeof c.redis === 'object' &&
    typeof c.chatModel === 'object'
  );
}
