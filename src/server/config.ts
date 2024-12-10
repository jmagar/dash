import type { Config } from '../types/config';
import { LogLevel } from '../types/logger';

const config: Config = {
  server: {
    env: process.env.NODE_ENV as Config['server']['env'] || 'development',
    host: process.env.HOST || 'localhost',
    port: parseInt(process.env.PORT || '3000', 10),
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    maxRequestSize: parseInt(process.env.MAX_REQUEST_SIZE || '50', 10) * 1024 * 1024,
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: (process.env.CORS_METHODS || 'GET,POST,PUT,DELETE,OPTIONS').split(','),
      allowedHeaders: process.env.CORS_ALLOWED_HEADERS || '*',
      exposedHeaders: process.env.CORS_EXPOSED_HEADERS || '*',
      credentials: true,
      maxAge: parseInt(process.env.CORS_MAX_AGE || '86400', 10),
    },
    security: {
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '50', 10) * 1024 * 1024,
      maxUploadFiles: parseInt(process.env.MAX_UPLOAD_FILES || '5', 10),
      allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || '.txt,.log,.json').split(','),
      jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
      jwtExpiration: parseInt(process.env.JWT_EXPIRATION || '86400', 10),
      refreshSecret: process.env.REFRESH_SECRET || process.env.JWT_SECRET || 'your-refresh-secret',
      tokenExpiration: process.env.TOKEN_EXPIRATION || '1h',
      refreshExpiration: process.env.REFRESH_EXPIRATION || '7d',
      tokenRefreshInterval: parseInt(process.env.TOKEN_REFRESH_INTERVAL || '300000', 10),
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10),
      max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      db: parseInt(process.env.REDIS_DB || '0', 10),
      password: process.env.REDIS_PASSWORD || '',
    },
    process: {
      maxMemory: parseInt(process.env.MAX_MEMORY || '1024', 10),
      maxCpu: parseInt(process.env.MAX_CPU || '80', 10),
      monitorInterval: parseInt(process.env.PROCESS_MONITOR_INTERVAL || '5000', 10),
      maxMonitoredHosts: parseInt(process.env.PROCESS_MAX_MONITORED_HOSTS || '100', 10),
      includeChildren: process.env.PROCESS_INCLUDE_CHILDREN !== 'false',
      excludeSystemProcesses: process.env.PROCESS_EXCLUDE_SYSTEM === 'true',
    },
    monitoring: {
      enabled: process.env.MONITORING_ENABLED !== 'false',
      interval: parseInt(process.env.MONITORING_INTERVAL || '60000', 10),
      retention: parseInt(process.env.MONITORING_RETENTION || '86400', 10),
    },
    logging: {
      level: (process.env.LOG_LEVEL || 'info') as LogLevel,
      format: process.env.LOG_FORMAT || 'json',
      dir: process.env.LOG_DIR || 'logs',
      maxFiles: parseInt(process.env.LOG_MAX_FILES || '5', 10),
      maxSize: parseInt(process.env.LOG_MAX_SIZE || '10', 10) * 1024 * 1024,
    },
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'dashboard',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10', 10),
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
  },
  ssh: {
    defaultPort: parseInt(process.env.SSH_DEFAULT_PORT || '22', 10),
    timeout: parseInt(process.env.SSH_TIMEOUT || '10000', 10),
    retries: parseInt(process.env.SSH_RETRIES || '3', 10),
    keyPath: process.env.SSH_KEY_PATH || '~/.ssh/id_rsa',
  },
  monitoring: {
    enabled: process.env.MONITORING_ENABLED !== 'false',
    interval: parseInt(process.env.MONITORING_INTERVAL || '60000', 10),
    retention: parseInt(process.env.MONITORING_RETENTION || '86400', 10),
  },
  alerts: {
    enabled: process.env.ALERTS_ENABLED !== 'false',
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE !== 'false',
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  },
  logging: {
    level: (process.env.LOG_LEVEL || 'info') as LogLevel,
    format: process.env.LOG_FORMAT || 'json',
    dir: process.env.LOG_DIR || 'logs',
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '5', 10),
    maxSize: parseInt(process.env.LOG_MAX_SIZE || '10', 10) * 1024 * 1024,
  },
  metrics: {
    enabled: process.env.METRICS_ENABLED !== 'false',
    prefix: process.env.METRICS_PREFIX || 'app_',
    defaultLabels: {
      app: process.env.APP_NAME || 'dashboard',
      env: process.env.NODE_ENV || 'development',
    },
  },
  agent: {
    enabled: process.env.AGENT_ENABLED !== 'false',
    version: process.env.AGENT_VERSION || '1.0.0',
    updateInterval: parseInt(process.env.AGENT_UPDATE_INTERVAL || '3600000', 10),
    copyFile: process.env.AGENT_COPY_FILE || '/usr/local/bin/agent',
  },
  chatModel: {
    provider: process.env.CHAT_MODEL_PROVIDER || 'openai',
    apiKey: process.env.CHAT_MODEL_API_KEY || '',
    model: (process.env.CHAT_MODEL_NAME || 'gpt-4') as Config['chatModel']['model'],
    temperature: parseFloat(process.env.CHAT_MODEL_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.CHAT_MODEL_MAX_TOKENS || '2048', 10),
  },
};

export default config;

