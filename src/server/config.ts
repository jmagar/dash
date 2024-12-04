import { config as dotenvConfig } from 'dotenv';
import type { Config } from '../types/config';
import { LoggingManager } from './utils/logging/LoggingManager';

dotenvConfig();

// Type-safe environment variables
type RequiredEnvVars = typeof requiredEnvVars[number];
type OptionalEnvVars = 
  | 'NODE_ENV' | 'HOST' | 'PORT' | 'BASE_URL' | 'CORS_ORIGIN'
  | 'MAX_REQUEST_SIZE' | 'CORS_ALLOWED_HEADERS' | 'CORS_EXPOSED_HEADERS'
  | 'CORS_MAX_AGE' | 'RATE_LIMIT_WINDOW' | 'RATE_LIMIT_MAX'
  | 'REFRESH_SECRET' | 'TOKEN_EXPIRATION' | 'REFRESH_EXPIRATION'
  | 'TOKEN_REFRESH_INTERVAL' | 'SESSION_MAX_AGE' | 'MAX_FILE_SIZE'
  | 'REDIS_HOST' | 'REDIS_PORT' | 'REDIS_PASSWORD' | 'REDIS_DB'
  | 'LOG_LEVEL' | 'LOG_FORMAT' | 'LOG_DIR' | 'LOG_MAX_FILES' | 'LOG_MAX_SIZE'
  | 'MONITORING_ENABLED' | 'MONITORING_INTERVAL' | 'METRICS_PATH'
  | 'PROCESS_MONITOR_INTERVAL' | 'PROCESS_MAX_MONITORED_HOSTS'
  | 'PROCESS_INCLUDE_CHILDREN' | 'PROCESS_EXCLUDE_SYSTEM'
  | 'PROCESS_SORT_BY' | 'PROCESS_SORT_ORDER' | 'PROCESS_MAX_PROCESSES'
  | 'BINARIES_PATH'
  | 'POSTGRES_HOST' | 'POSTGRES_PORT' | 'POSTGRES_DB' | 'POSTGRES_USER'
  | 'JWT_EXPIRY' | 'JWT_REFRESH_EXPIRY'
  | 'OPENAI_API_KEY' | 'OPENAI_MODEL' | 'OPENAI_ORG'
  | 'OPENAI_MAX_TOKENS' | 'OPENAI_TEMPERATURE'
  | 'OPENROUTER_API_KEY' | 'OPENROUTER_MODEL' | 'OPENROUTER_BASE_URL'
  | 'OPENROUTER_MAX_TOKENS' | 'OPENROUTER_TEMPERATURE'
  | 'GOTIFY_URL' | 'GOTIFY_TOKEN';

type EnvVars = RequiredEnvVars | OptionalEnvVars;

// Type-safe environment getter
function getEnvVar<T extends EnvVars>(key: T, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    LoggingManager.getInstance().error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
  return value ?? defaultValue!;
}

// Helper function to parse boolean env vars with type safety
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}

// Helper function to parse number with validation and type safety
function parseNumber(
  value: string | undefined, 
  defaultValue: number, 
  min?: number, 
  max?: number
): number {
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    LoggingManager.getInstance().warn(`Invalid number format for value: ${value}, using default: ${defaultValue}`);
    return defaultValue;
  }
  if (min !== undefined && parsed < min) {
    LoggingManager.getInstance().warn(`Value ${parsed} is below minimum ${min}, using minimum value`);
    return min;
  }
  if (max !== undefined && parsed > max) {
    LoggingManager.getInstance().warn(`Value ${parsed} is above maximum ${max}, using maximum value`);
    return max;
  }
  return parsed;
}

// Environment validation with type safety
const requiredEnvVars = [
  'JWT_SECRET',
  'POSTGRES_PASSWORD'
] as const;

for (const envVar of requiredEnvVars) {
  getEnvVar(envVar);
}

const config: Config = {
  server: {
    env: getEnvVar('NODE_ENV', 'development') as Config['server']['env'],
    host: getEnvVar('HOST', 'localhost'),
    port: parseNumber(getEnvVar('PORT', '4000'), 4000, 1, 65535),
    baseUrl: getEnvVar('BASE_URL', 'http://localhost:4000'),
    maxRequestSize: parseNumber(
      getEnvVar('MAX_REQUEST_SIZE', '104857600'),
      104857600,
      1024,
      100 * 1024 * 1024
    ),
    cors: {
      origin: getEnvVar('CORS_ORIGIN', '*'),
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: getEnvVar('CORS_ALLOWED_HEADERS', 'Content-Type,Authorization,X-Requested-With'),
      exposedHeaders: getEnvVar('CORS_EXPOSED_HEADERS', ''),
      credentials: true,
      maxAge: parseNumber(getEnvVar('CORS_MAX_AGE', '86400'), 86400, 0, 86400),
    },
    rateLimit: {
      windowMs: parseNumber(getEnvVar('RATE_LIMIT_WINDOW', '15 * 60 * 1000'), 15 * 60 * 1000, 1000, 24 * 60 * 60 * 1000),
      max: parseNumber(getEnvVar('RATE_LIMIT_MAX', '100'), 100, 1, 1000),
    },
    security: {
      jwtSecret: getEnvVar('JWT_SECRET'),
      refreshSecret: getEnvVar('REFRESH_SECRET', getEnvVar('JWT_SECRET')),
      tokenExpiration: getEnvVar('TOKEN_EXPIRATION', '1h'),
      refreshExpiration: getEnvVar('REFRESH_EXPIRATION', '7d'),
      tokenRefreshInterval: parseNumber(getEnvVar('TOKEN_REFRESH_INTERVAL', '300000'), 300000, 60000, 3600000),
      sessionMaxAge: parseNumber(getEnvVar('SESSION_MAX_AGE', '3600000'), 3600000, 60000, 24 * 60 * 60 * 1000),
      maxFileSize: parseNumber(getEnvVar('MAX_FILE_SIZE', '52428800'), 52428800, 1024, 500 * 1024 * 1024),
    },
    redis: {
      host: getEnvVar('REDIS_HOST', 'localhost'),
      port: parseNumber(getEnvVar('REDIS_PORT', '6379'), 6379, 1, 65535),
      password: getEnvVar('REDIS_PASSWORD'),
      db: parseNumber(getEnvVar('REDIS_DB', '0'), 0, 0, 15),
    },
    logging: {
      level: (getEnvVar('LOG_LEVEL', 'info')) as 'error' | 'warn' | 'info' | 'debug' | 'trace',
      format: getEnvVar('LOG_FORMAT', 'json'),
      dir: getEnvVar('LOG_DIR', 'logs'),
      maxFiles: parseNumber(getEnvVar('LOG_MAX_FILES', '5'), 5, 1, 100),
      maxSize: getEnvVar('LOG_MAX_SIZE', '10m'),
    },
    monitoring: {
      enabled: parseBoolean(getEnvVar('MONITORING_ENABLED', 'false'), false),
      interval: parseNumber(getEnvVar('MONITORING_INTERVAL', '5000'), 5000, 1000, 60000),
      metricsPath: getEnvVar('METRICS_PATH', '/metrics'),
    },
    process: {
      monitorInterval: parseNumber(getEnvVar('PROCESS_MONITOR_INTERVAL', '5000'), 5000, 1000, 60000),
      maxMonitoredHosts: parseNumber(getEnvVar('PROCESS_MAX_MONITORED_HOSTS', '100'), 100, 1, 1000),
      includeChildren: parseBoolean(getEnvVar('PROCESS_INCLUDE_CHILDREN', 'true'), true),
      excludeSystemProcesses: parseBoolean(getEnvVar('PROCESS_EXCLUDE_SYSTEM', 'false'), false),
      sortBy: (getEnvVar('PROCESS_SORT_BY', 'cpu')) as 'cpu' | 'memory' | 'pid' | 'name',
      sortOrder: (getEnvVar('PROCESS_SORT_ORDER', 'desc')) as 'asc' | 'desc',
      maxProcesses: parseNumber(getEnvVar('PROCESS_MAX_PROCESSES', '100'), 100, 1, 1000),
    },
  },
  logging: {
    level: getEnvVar('LOG_LEVEL', 'info'),
    format: getEnvVar('LOG_FORMAT', 'json'),
    dir: getEnvVar('LOG_DIR', 'logs'),
    maxFiles: parseNumber(getEnvVar('LOG_MAX_FILES', '5'), 5, 1, 100),
    maxSize: getEnvVar('LOG_MAX_SIZE', '10m'),
  },
  redis: {
    host: getEnvVar('REDIS_HOST', 'localhost'),
    port: parseNumber(getEnvVar('REDIS_PORT', '6379'), 6379, 1, 65535),
    password: getEnvVar('REDIS_PASSWORD'),
    db: parseNumber(getEnvVar('REDIS_DB', '0'), 0, 0, 15),
  },
  paths: {
    binaries: getEnvVar('BINARIES_PATH', './binaries'),
  },
  process: {
    env: getEnvVar('NODE_ENV', 'development'),
  },
  db: {
    host: getEnvVar('POSTGRES_HOST', 'localhost'),
    port: parseNumber(getEnvVar('POSTGRES_PORT', '5432'), 5432, 1, 65535),
    name: getEnvVar('POSTGRES_DB', 'shh'),
    user: getEnvVar('POSTGRES_USER', 'postgres'),
    password: getEnvVar('POSTGRES_PASSWORD'),
  },
  jwt: {
    secret: getEnvVar('JWT_SECRET'),
    expiry: getEnvVar('JWT_EXPIRY', '1h'),
    refreshExpiry: getEnvVar('JWT_REFRESH_EXPIRY', '7d'),
  },
  openai: {
    apiKey: getEnvVar('OPENAI_API_KEY'),
    model: getEnvVar('OPENAI_MODEL', 'gpt-4'),
    org: getEnvVar('OPENAI_ORG'),
    maxTokens: parseNumber(getEnvVar('OPENAI_MAX_TOKENS', '2000'), 2000, 1, 32000),
    temperature: parseFloat(getEnvVar('OPENAI_TEMPERATURE', '0.7')),
  },
  openrouter: {
    apiKey: getEnvVar('OPENROUTER_API_KEY'),
    model: getEnvVar('OPENROUTER_MODEL', 'anthropic/claude-2'),
    baseUrl: getEnvVar('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1/chat/completions'),
    maxTokens: parseNumber(getEnvVar('OPENROUTER_MAX_TOKENS', '2000'), 2000, 1, 32000),
    temperature: parseFloat(getEnvVar('OPENROUTER_TEMPERATURE', '0.7')),
  },
  gotify: {
    url: getEnvVar('GOTIFY_URL'),
    token: getEnvVar('GOTIFY_TOKEN'),
  },
};

// Validate configuration
function validateConfig(cfg: Config): void {
  // Validate JWT secrets in production
  if (cfg.server.env === 'production') {
    if (cfg.server.security.jwtSecret === 'your-secret-key') {
      LoggingManager.getInstance().error('Production environment detected but using default JWT secret');
      process.exit(1);
    }
  }

  // Validate monitoring interval
  if (cfg.server.monitoring.interval < 1000) {
    LoggingManager.getInstance().warn('Monitoring interval is less than 1 second, this may impact performance');
  }

  // Validate rate limiting
  if (cfg.server.rateLimit.max > 1000) {
    LoggingManager.getInstance().warn('High rate limit detected, this may impact server performance');
  }

  // Validate token refresh interval
  if (cfg.server.security.tokenRefreshInterval < 60000) {
    LoggingManager.getInstance().warn('Token refresh interval is less than 1 minute, this may cause excessive server load');
  }

  // Log configuration in development
  if (cfg.server.env === 'development') {
    LoggingManager.getInstance().debug('Server configuration:', {
      ...cfg,
      server: {
        ...cfg.server,
        security: {
          ...cfg.server.security,
          jwtSecret: '[REDACTED]',
          refreshSecret: '[REDACTED]',
        },
      },
      db: {
        ...cfg.db,
        password: '[REDACTED]',
      },
    });
  }
}

validateConfig(config);

export default config;

