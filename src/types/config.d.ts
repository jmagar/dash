export interface SecurityConfig {
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
    algorithm: 'HS512';
  };
  allowedOrigins: string[];
  disableAuth: boolean;
  maxLoginAttempts: number;
  loginLockoutTime: number;
  bcryptRounds: number;
}

export interface ServerConfig {
  port: string | number;
  host: string;
  env: string;
  maxRequestSize: string;
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: boolean;
}

export interface RedisConfig {
  host: string;
  port: number;
  db: number;
  maxRetries: number;
  memoryLimit: string;
  maxKeys: number;
  metricsInterval: number;
}

export interface LoggingConfig {
  level: string;
  format: string;
}

export interface UploadConfig {
  maxFileSize: string;
  allowedExtensions: string[];
  tempDir: string;
}

export interface Config {
  server: ServerConfig;
  security: SecurityConfig;
  rateLimit: RateLimitConfig;
  db: DatabaseConfig;
  redis: RedisConfig;
  logging: LoggingConfig;
  upload: UploadConfig;
}
