import dotenv from 'dotenv';
import type { Config } from '../types/config';

dotenv.config();

const config: Config = {
  server: {
    env: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
    host: process.env.HOST || 'localhost',
    port: parseInt(process.env.PORT || '3000', 10),
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    maxRequestSize: parseInt(process.env.MAX_REQUEST_SIZE || '10485760', 10), // 10MB
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: process.env.CORS_ALLOWED_HEADERS || 'Content-Type,Authorization',
      exposedHeaders: process.env.CORS_EXPOSED_HEADERS || '',
      credentials: true,
      maxAge: parseInt(process.env.CORS_MAX_AGE || '86400', 10),
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    },
    security: {
      jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
      refreshSecret: process.env.REFRESH_SECRET || 'your-refresh-secret',
      tokenExpiration: process.env.TOKEN_EXPIRATION || '1h',
      refreshExpiration: process.env.REFRESH_EXPIRATION || '7d',
      sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE || '3600000'),
      maxFileSize: 50 * 1024 * 1024, // 50MB
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),
    },
    logging: {
      level: (process.env.LOG_LEVEL || 'info') as 'error' | 'warn' | 'info' | 'debug' | 'trace',
      format: process.env.LOG_FORMAT || 'json',
      dir: process.env.LOG_DIR || 'logs',
      maxFiles: parseInt(process.env.LOG_MAX_FILES || '5', 10),
      maxSize: process.env.LOG_MAX_SIZE || '10m'
    },
    monitoring: {
      enabled: process.env.MONITORING_ENABLED === 'true',
      interval: parseInt(process.env.MONITORING_INTERVAL || '5000', 10),
      metricsPath: process.env.METRICS_PATH || '/metrics',
    },
    process: {
      monitorInterval: parseInt(process.env.PROCESS_MONITOR_INTERVAL || '5000', 10),
      maxMonitoredHosts: parseInt(process.env.PROCESS_MAX_MONITORED_HOSTS || '100', 10),
      includeChildren: process.env.PROCESS_INCLUDE_CHILDREN !== 'false',
      excludeSystemProcesses: process.env.PROCESS_EXCLUDE_SYSTEM === 'true',
      sortBy: (process.env.PROCESS_SORT_BY || 'cpu') as 'cpu' | 'memory' | 'pid' | 'name',
      sortOrder: (process.env.PROCESS_SORT_ORDER || 'desc') as 'asc' | 'desc',
      maxProcesses: parseInt(process.env.PROCESS_MAX_PROCESSES || '100', 10),
    },
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
    dir: process.env.LOG_DIR || 'logs',
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '5', 10),
    maxSize: process.env.LOG_MAX_SIZE || '10m',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  paths: {
    binaries: process.env.BINARIES_PATH || './binaries',
  },
  process: {
    env: process.env.NODE_ENV || 'development',
  },
  db: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    name: process.env.POSTGRES_DB || 'shh',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiry: process.env.JWT_EXPIRY || '1h',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4',
    org: process.env.OPENAI_ORG,
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000', 10),
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
  },
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
    model: process.env.OPENROUTER_MODEL || 'anthropic/claude-2',
    baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1/chat/completions',
    maxTokens: parseInt(process.env.OPENROUTER_MAX_TOKENS || '2000', 10),
    temperature: parseFloat(process.env.OPENROUTER_TEMPERATURE || '0.7'),
  },
  gotify: {
    url: process.env.GOTIFY_URL,
    token: process.env.GOTIFY_TOKEN,
  },
};

export default config;
