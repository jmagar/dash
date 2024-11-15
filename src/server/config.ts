import { config as dotenvConfig } from 'dotenv';

import type { Config } from '../types/config';

dotenvConfig();

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getOptionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

function parseOptionalInt(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function parseOptionalFloat(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

export const config: Config = {
  env: getOptionalEnv('NODE_ENV', 'development'),
  port: parseOptionalInt(process.env.PORT, 3000),
  host: getOptionalEnv('HOST', 'localhost'),

  db: {
    host: getRequiredEnv('DB_HOST'),
    port: parseOptionalInt(getRequiredEnv('DB_PORT'), 5432),
    user: getRequiredEnv('DB_USER'),
    password: getRequiredEnv('DB_PASSWORD'),
    database: getRequiredEnv('DB_NAME'),
  },

  jwt: {
    secret: getRequiredEnv('JWT_SECRET'),
    expiresIn: getOptionalEnv('JWT_EXPIRES_IN', '1h'),
    refreshExpiresIn: getOptionalEnv('JWT_REFRESH_EXPIRES_IN', '7d'),
  },

  openai: {
    apiKey: getOptionalEnv('OPENAI_API_KEY', ''),
    model: getOptionalEnv('OPENAI_MODEL', 'gpt-4'),
    organization: process.env.OPENAI_ORG,
    maxTokens: parseOptionalInt(process.env.OPENAI_MAX_TOKENS, 2000),
    temperature: parseOptionalFloat(process.env.OPENAI_TEMPERATURE, 0.7),
  },

  openrouter: {
    apiKey: getOptionalEnv('OPENROUTER_API_KEY', ''),
    model: getOptionalEnv('OPENROUTER_MODEL', 'anthropic/claude-2'),
    baseUrl: getOptionalEnv('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1/chat/completions'),
    maxTokens: parseOptionalInt(process.env.OPENROUTER_MAX_TOKENS, 2000),
    temperature: parseOptionalFloat(process.env.OPENROUTER_TEMPERATURE, 0.7),
  },

  logging: {
    level: getOptionalEnv('LOG_LEVEL', 'info'),
    file: getOptionalEnv('LOG_FILE', 'logs/app.log'),
  },

  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },

  redis: {
    host: getOptionalEnv('REDIS_HOST', 'localhost'),
    port: parseOptionalInt(process.env.REDIS_PORT, 6379),
    password: process.env.REDIS_PASSWORD,
  },

  prometheus: {
    port: parseOptionalInt(process.env.PROMETHEUS_PORT, 9090),
  },

  security: {
    allowedOrigins: process.env.SECURITY_ALLOWED_ORIGINS ? process.env.SECURITY_ALLOWED_ORIGINS.split(',') : ['*'],
    allowedHeaders: process.env.SECURITY_ALLOWED_HEADERS ? process.env.SECURITY_ALLOWED_HEADERS.split(',') : ['Content-Type', 'Authorization'],
    allowedMethods: process.env.SECURITY_ALLOWED_METHODS ? process.env.SECURITY_ALLOWED_METHODS.split(',') : ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    exposedHeaders: process.env.SECURITY_EXPOSED_HEADERS ? process.env.SECURITY_EXPOSED_HEADERS.split(',') : [],
    maxAge: parseOptionalInt(process.env.SECURITY_MAX_AGE, 86400),
    credentials: process.env.SECURITY_CREDENTIALS === 'true',
  },

  rateLimit: {
    windowMs: parseOptionalInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000), // 15 minutes
    max: parseOptionalInt(process.env.RATE_LIMIT_MAX, 100), // 100 requests per windowMs
  },
};
