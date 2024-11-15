export interface Config {
  baseUrl: string;
  appName: string;
  security: {
    loginLockoutTime: number;
    maxLoginAttempts: number;
    jwtSecret: string;
    jwtExpiresIn: string;
    allowedOrigins: string[];
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    maxRetriesPerRequest: number;
  };
  metrics: {
    interval: number;
  };
  postgres: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
  server: {
    port: number;
    host: string;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
}

export const config: Config = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  appName: process.env.APP_NAME || 'SSH Management Platform',
  security: {
    loginLockoutTime: parseInt(process.env.LOGIN_LOCKOUT_TIME || '300000', 10), // 5 minutes
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
  },
  metrics: {
    interval: parseInt(process.env.METRICS_INTERVAL || '60000', 10), // 1 minute
  },
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || 'shh',
  },
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || 'localhost',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
}
