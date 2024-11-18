export interface ServerConfig {
  env: 'development' | 'production' | 'test';
  host: string;
  port: number;
  baseUrl: string;
  maxRequestSize: number;
  cors: {
    origin: string;
    methods: string[];
    allowedHeaders: string;
    exposedHeaders: string;
    credentials: boolean;
    maxAge: number;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
  security: {
    jwtSecret: string;
    refreshSecret: string;
    tokenExpiration: string;
    refreshExpiration: string;
    sessionMaxAge: number;
    maxFileSize: number;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  logging: {
    level: string;
    format: string;
    dir: string;
    maxFiles: number;
    maxSize: string;
  };
  monitoring: {
    enabled: boolean;
    interval: number;
    metricsPath: string;
  };
  process: {
    monitorInterval: number;
    maxMonitoredHosts: number;
    includeChildren: boolean;
    excludeSystemProcesses: boolean;
    sortBy: 'cpu' | 'memory' | 'pid' | 'name';
    sortOrder: 'asc' | 'desc';
    maxProcesses: number;
  };
}

export interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
}

export interface JwtConfig {
  secret: string;
  expiry: string;
  refreshExpiry: string;
}

export interface OpenAIConfig {
  apiKey?: string;
  model: string;
  org?: string;
  maxTokens: number;
  temperature: number;
}

export interface OpenRouterConfig {
  apiKey?: string;
  model: string;
  baseUrl: string;
  maxTokens: number;
  temperature: number;
}

export interface GotifyConfig {
  url?: string;
  token?: string;
}

export interface LoggingConfig {
  level: string;
  format: string;
  dir: string;
  maxFiles: number;
  maxSize: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
}

export interface Config {
  server: ServerConfig;
  db: DatabaseConfig;
  jwt: JwtConfig;
  openai: OpenAIConfig;
  openrouter: OpenRouterConfig;
  gotify: GotifyConfig;
  logging: LoggingConfig;
  paths: {
    binaries: string;
  };
  redis: RedisConfig;
  process: {
    env: string;
  };
}
