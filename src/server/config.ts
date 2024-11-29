import dotenv from 'dotenv';
import type { Config } from '../types/config';
import { logger } from './utils/logger';

dotenv.config();

// Helper function to parse boolean env vars
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}

// Helper function to parse number with validation
function parseNumber(value: string | undefined, defaultValue: number, min?: number, max?: number): number {
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) return defaultValue;
  if (min !== undefined && parsed < min) return min;
  if (max !== undefined && parsed > max) return max;
  return parsed;
}

// Environment validation
const requiredEnvVars = [
  'JWT_SECRET',
  'POSTGRES_PASSWORD'
] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    logger.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const config: Config = {
  server: {
    env: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
    host: process.env.HOST || 'localhost',
    port: parseNumber(process.env.PORT, 4000, 1, 65535), // Default to 4000 to match client
    baseUrl: process.env.BASE_URL || 'http://localhost:4000', // Match port 4000
    maxRequestSize: parseNumber(process.env.MAX_REQUEST_SIZE, 104857600, 1024, 100 * 1024 * 1024), // 100MB - matches client maxUploadSize
    cors: {
      origin: process.env.CORS_ORIGIN || '*', // Allow all origins in dev
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: process.env.CORS_ALLOWED_HEADERS || 'Content-Type,Authorization,X-Requested-With',
      exposedHeaders: process.env.CORS_EXPOSED_HEADERS || '',
      credentials: true,
      maxAge: parseNumber(process.env.CORS_MAX_AGE, 86400, 0, 86400),
    },
    rateLimit: {
      windowMs: parseNumber(process.env.RATE_LIMIT_WINDOW, 15 * 60 * 1000, 1000, 24 * 60 * 60 * 1000),
      max: parseNumber(process.env.RATE_LIMIT_MAX, 100, 1, 1000),
    },
    security: {
      jwtSecret: process.env.JWT_SECRET!,
      refreshSecret: process.env.REFRESH_SECRET || process.env.JWT_SECRET!,
      tokenExpiration: process.env.TOKEN_EXPIRATION || '1h',
      refreshExpiration: process.env.REFRESH_EXPIRATION || '7d',
      tokenRefreshInterval: parseNumber(process.env.TOKEN_REFRESH_INTERVAL, 300000, 60000, 3600000), // 5 minutes, matches client
      sessionMaxAge: parseNumber(process.env.SESSION_MAX_AGE, 3600000, 60000, 24 * 60 * 60 * 1000),
      maxFileSize: parseNumber(process.env.MAX_FILE_SIZE, 52428800, 1024, 500 * 1024 * 1024), // 50MB - matches client maxFileSize
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseNumber(process.env.REDIS_PORT, 6379, 1, 65535),
      password: process.env.REDIS_PASSWORD,
      db: parseNumber(process.env.REDIS_DB, 0, 0, 15),
    },
    logging: {
      level: (process.env.LOG_LEVEL || 'info') as 'error' | 'warn' | 'info' | 'debug' | 'trace',
      format: process.env.LOG_FORMAT || 'json',
      dir: process.env.LOG_DIR || 'logs',
      maxFiles: parseNumber(process.env.LOG_MAX_FILES, 5, 1, 100),
      maxSize: process.env.LOG_MAX_SIZE || '10m',
    },
    monitoring: {
      enabled: parseBoolean(process.env.MONITORING_ENABLED, false),
      interval: parseNumber(process.env.MONITORING_INTERVAL, 5000, 1000, 60000),
      metricsPath: process.env.METRICS_PATH || '/metrics',
    },
    process: {
      monitorInterval: parseNumber(process.env.PROCESS_MONITOR_INTERVAL, 5000, 1000, 60000),
      maxMonitoredHosts: parseNumber(process.env.PROCESS_MAX_MONITORED_HOSTS, 100, 1, 1000),
      includeChildren: parseBoolean(process.env.PROCESS_INCLUDE_CHILDREN, true),
      excludeSystemProcesses: parseBoolean(process.env.PROCESS_EXCLUDE_SYSTEM, false),
      sortBy: (process.env.PROCESS_SORT_BY || 'cpu') as 'cpu' | 'memory' | 'pid' | 'name',
      sortOrder: (process.env.PROCESS_SORT_ORDER || 'desc') as 'asc' | 'desc',
      maxProcesses: parseNumber(process.env.PROCESS_MAX_PROCESSES, 100, 1, 1000),
    },
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    dir: process.env.LOG_DIR || 'logs',
    maxFiles: parseNumber(process.env.LOG_MAX_FILES, 5, 1, 100),
    maxSize: process.env.LOG_MAX_SIZE || '10m',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseNumber(process.env.REDIS_PORT, 6379, 1, 65535),
    password: process.env.REDIS_PASSWORD,
    db: parseNumber(process.env.REDIS_DB, 0, 0, 15),
  },
  paths: {
    binaries: process.env.BINARIES_PATH || './binaries',
  },
  process: {
    env: process.env.NODE_ENV || 'development',
  },
  db: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseNumber(process.env.POSTGRES_PORT, 5432, 1, 65535),
    name: process.env.POSTGRES_DB || 'shh',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD!,
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiry: process.env.JWT_EXPIRY || '1h',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4',
    org: process.env.OPENAI_ORG,
    maxTokens: parseNumber(process.env.OPENAI_MAX_TOKENS, 2000, 1, 32000),
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
  },
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
    model: process.env.OPENROUTER_MODEL || 'anthropic/claude-2',
    baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1/chat/completions',
    maxTokens: parseNumber(process.env.OPENROUTER_MAX_TOKENS, 2000, 1, 32000),
    temperature: parseFloat(process.env.OPENROUTER_TEMPERATURE || '0.7'),
  },
  gotify: {
    url: process.env.GOTIFY_URL,
    token: process.env.GOTIFY_TOKEN,
  },
};

// Validate configuration
function validateConfig(cfg: Config): void {
  // Validate JWT secrets in production
  if (cfg.server.env === 'production') {
    if (cfg.server.security.jwtSecret === 'your-secret-key') {
      logger.error('Production environment detected but using default JWT secret');
      process.exit(1);
    }
  }

  // Validate monitoring interval
  if (cfg.server.monitoring.interval < 1000) {
    logger.warn('Monitoring interval is less than 1 second, this may impact performance');
  }

  // Validate rate limiting
  if (cfg.server.rateLimit.max > 1000) {
    logger.warn('High rate limit detected, this may impact server performance');
  }

  // Validate token refresh interval
  if (cfg.server.security.tokenRefreshInterval < 60000) {
    logger.warn('Token refresh interval is less than 1 minute, this may cause excessive server load');
  }

  // Log configuration in development
  if (cfg.server.env === 'development') {
    logger.debug('Server configuration:', {
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
