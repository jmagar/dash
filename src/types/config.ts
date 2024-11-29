export interface Config {
  server: {
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
      tokenRefreshInterval: number; // Added to match client config
    };
    redis: {
      host: string;
      port: number;
      password?: string;
      db: number;
    };
    logging: {
      level: 'error' | 'warn' | 'info' | 'debug' | 'trace';
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
  };
  logging: {
    level: string;
    format: string;
    dir: string;
    maxFiles: number;
    maxSize: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  paths: {
    binaries: string;
  };
  process: {
    env: string;
  };
  db: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
  };
  jwt: {
    secret: string;
    expiry: string;
    refreshExpiry: string;
  };
  openai: {
    apiKey?: string;
    model: string;
    org?: string;
    maxTokens: number;
    temperature: number;
  };
  openrouter: {
    apiKey?: string;
    model: string;
    baseUrl: string;
    maxTokens: number;
    temperature: number;
  };
  gotify: {
    url?: string;
    token?: string;
  };
}
