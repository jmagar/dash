import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Generate a secure random key if JWT_SECRET is not provided
const generateSecureSecret = () => {
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set in production environment');
  }
  return crypto.randomBytes(64).toString('hex');
};

export const config = {
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
    env: process.env.NODE_ENV || 'development',
    maxRequestSize: process.env.MAX_REQUEST_SIZE || '10mb',
  },

  security: {
    jwt: {
      secret: process.env.JWT_SECRET || generateSecureSecret(),
      expiresIn: process.env.JWT_EXPIRATION || '1h',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
      algorithm: 'HS512' as const,
    },
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:4000,http://localhost:3000').split(','),
    disableAuth: process.env.NODE_ENV !== 'production' && process.env.DISABLE_AUTH === 'true',
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    loginLockoutTime: parseInt(process.env.LOGIN_LOCKOUT_TIME || '300000', 10), // 5 minutes
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  db: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || 'shh',
    ssl: process.env.NODE_ENV === 'production',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    db: parseInt(process.env.REDIS_DB || '0', 10),
    maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
    memoryLimit: process.env.REDIS_MEMORY_LIMIT || '128mb',
    maxKeys: parseInt(process.env.REDIS_MAX_KEYS || '10000', 10),
    metricsInterval: parseInt(process.env.REDIS_METRICS_INTERVAL || '5000', 10),
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.NODE_ENV === 'production' ? 'json' : 'dev',
  },

  upload: {
    maxFileSize: process.env.MAX_FILE_SIZE || '50mb',
    allowedExtensions: (process.env.ALLOWED_UPLOAD_EXTENSIONS || '.txt,.md,.json,.yml,.yaml,.js,.ts,.tsx,.jsx').split(','),
    tempDir: '/tmp/',
  },
};

// Required environment variables in production
const requiredInProduction = [
  'JWT_SECRET',
  'POSTGRES_HOST',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'POSTGRES_DB',
  'REDIS_HOST',
];

if (process.env.NODE_ENV === 'production') {
  for (const envVar of requiredInProduction) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable in production: ${envVar}`);
    }
  }
}

export default config;
