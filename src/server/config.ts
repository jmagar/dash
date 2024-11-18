import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv();

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  MAX_REQUEST_SIZE: z.coerce.number().default(10 * 1024 * 1024), // 10MB

  // Database
  DB_HOST: z.string(),
  DB_PORT: z.coerce.number().default(5432),
  DB_NAME: z.string(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  // JWT
  JWT_SECRET: z.string(),
  JWT_EXPIRY: z.string().default('1h'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  CORS_METHODS: z.string().default('GET,HEAD,PUT,PATCH,POST,DELETE'),
  CORS_ALLOWED_HEADERS: z.string().default('Content-Type,Authorization'),
  CORS_EXPOSED_HEADERS: z.string().default(''),
  CORS_CREDENTIALS: z.coerce.boolean().default(true),
  CORS_MAX_AGE: z.coerce.number().default(86400),

  // Rate Limiting
  RATE_LIMIT_WINDOW: z.coerce.number().default(15 * 60 * 1000), // 15 minutes
  RATE_LIMIT_MAX: z.coerce.number().default(100),

  // Security
  MAX_FILE_SIZE: z.coerce.number().default(50 * 1024 * 1024), // 50MB

  // OpenAI
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4'),
  OPENAI_ORG: z.string().optional(),
  OPENAI_MAX_TOKENS: z.coerce.number().default(2000),
  OPENAI_TEMPERATURE: z.coerce.number().default(0.7),

  // OpenRouter
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default('anthropic/claude-2'),
  OPENROUTER_BASE_URL: z.string().default('https://openrouter.ai/api/v1/chat/completions'),
  OPENROUTER_MAX_TOKENS: z.coerce.number().default(2000),
  OPENROUTER_TEMPERATURE: z.coerce.number().default(0.7),

  // Logging
  LOG_LEVEL: z.string().default('info'),
  LOG_FILE: z.string().default('/var/log/shh/app.log'),

  // Gotify
  GOTIFY_URL: z.string().optional(),
  GOTIFY_TOKEN: z.string().optional(),

  // Prometheus
  PROMETHEUS_PORT: z.coerce.number().default(9090),
});

const env = envSchema.parse(process.env);

export const config = {
  server: {
    env: env.NODE_ENV,
    port: env.PORT,
    host: env.HOST,
    maxRequestSize: env.MAX_REQUEST_SIZE,
  },
  db: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    name: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
  },
  redis: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiry: env.JWT_EXPIRY,
    refreshExpiry: env.JWT_REFRESH_EXPIRY,
  },
  cors: {
    origin: env.CORS_ORIGIN,
    methods: env.CORS_METHODS,
    allowedHeaders: env.CORS_ALLOWED_HEADERS,
    exposedHeaders: env.CORS_EXPOSED_HEADERS,
    credentials: env.CORS_CREDENTIALS,
    maxAge: env.CORS_MAX_AGE,
  },
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW,
    max: env.RATE_LIMIT_MAX,
  },
  security: {
    maxFileSize: env.MAX_FILE_SIZE,
  },
  openai: {
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
    org: env.OPENAI_ORG,
    maxTokens: env.OPENAI_MAX_TOKENS,
    temperature: env.OPENAI_TEMPERATURE,
  },
  openrouter: {
    apiKey: env.OPENROUTER_API_KEY,
    model: env.OPENROUTER_MODEL,
    baseUrl: env.OPENROUTER_BASE_URL,
    maxTokens: env.OPENROUTER_MAX_TOKENS,
    temperature: env.OPENROUTER_TEMPERATURE,
  },
  logging: {
    level: env.LOG_LEVEL,
    file: env.LOG_FILE,
  },
  gotify: {
    url: env.GOTIFY_URL,
    token: env.GOTIFY_TOKEN,
  },
  prometheus: {
    port: env.PROMETHEUS_PORT,
  },
} as const;
