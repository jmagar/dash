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

export interface Config {
  server: {
    port: number;
    host: string;
    env: string;
    maxRequestSize: string;
  };
  postgres: {
    user?: string;
    password?: string;
    host?: string;
    port: number;
    database?: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    maxRetriesPerRequest: number;
    memoryLimit: string;
    maxKeys: number;
    metricsInterval: number;
  };
  security: {
    jwt: {
      secret: string;
      expiresIn: string;
      refreshExpiresIn: string;
      algorithm: string;
    };
    allowedOrigins: string[];
    disableAuth: boolean;
    loginLockoutTime: number;
    maxLoginAttempts: number;
    bcryptRounds: number;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
  logging: {
    level: string;
    format: string;
  };
  upload: {
    maxFileSize: string;
    allowedExtensions: string[];
    tempDir: string;
  };
}

const parseNumber = (value: string | undefined, defaultValue: number): number => {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

export const config: Config = {
  server: {
    port: parseNumber(process.env.PORT, 3000),
    host: process.env.HOST || 'localhost',
    env: process.env.NODE_ENV || 'development',
    maxRequestSize: process.env.MAX_REQUEST_SIZE || '10mb',
  },

  postgres: {
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    host: process.env.POSTGRES_HOST,
    port: parseNumber(process.env.POSTGRES_PORT, 5432),
    database: process.env.POSTGRES_DB,
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseNumber(process.env.REDIS_PORT, 6379),
    password: process.env.REDIS_PASSWORD,
    db: parseNumber(process.env.REDIS_DB, 0),
    maxRetriesPerRequest: parseNumber(process.env.REDIS_MAX_RETRIES, 3),
    memoryLimit: process.env.REDIS_MEMORY_LIMIT || '128mb',
    maxKeys: parseNumber(process.env.REDIS_MAX_KEYS, 10000),
    metricsInterval: parseNumber(process.env.REDIS_METRICS_INTERVAL, 5000),
  },

  security: {
    jwt: {
      secret: process.env.JWT_SECRET || generateSecureSecret(),
      expiresIn: process.env.JWT_EXPIRATION || '1h',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
      algorithm: 'HS512',
    },
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:4000,http://localhost:3000').split(','),
    disableAuth: process.env.NODE_ENV !== 'production' && process.env.DISABLE_AUTH === 'true',
    loginLockoutTime: parseNumber(process.env.LOGIN_LOCKOUT_TIME, 300000), // 5 minutes
    maxLoginAttempts: parseNumber(process.env.MAX_LOGIN_ATTEMPTS, 5),
    bcryptRounds: parseNumber(process.env.BCRYPT_ROUNDS, 12),
  },

  rateLimit: {
    windowMs: parseNumber(process.env.RATE_LIMIT_WINDOW, 900000), // 15 minutes
    max: parseNumber(process.env.RATE_LIMIT_MAX_REQUESTS, 100),
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
