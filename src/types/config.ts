import { LogLevel } from './logger';

export type ChatModel = 'gpt-4' | 'gpt-3.5-turbo' | 'claude-2' | 'claude-instant';

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
    security: {
      maxFileSize: number;
      maxUploadFiles: number;
      allowedFileTypes: string[];
      jwtSecret: string;
      jwtExpiration: number;
      refreshSecret: string;
      tokenExpiration: string;
      refreshExpiration: string;
      tokenRefreshInterval: number;
    };
    rateLimit: {
      windowMs: number;
      max: number;
    };
    redis: {
      host: string;
      port: number;
      db: number;
      password: string;
    };
    process: {
      maxMemory: number;
      maxCpu: number;
      monitorInterval: number;
      maxMonitoredHosts: number;
      includeChildren: boolean;
      excludeSystemProcesses: boolean;
    };
    monitoring: {
      enabled: boolean;
      interval: number;
      retention: number;
    };
    logging: {
      level: LogLevel;
      format: string;
      dir: string;
      maxFiles: number;
      maxSize: number;
    };
  };
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    ssl: boolean;
    maxConnections: number;
    idleTimeout: number;
  };
  ssh: {
    defaultPort: number;
    timeout: number;
    retries: number;
    keyPath: string;
  };
  monitoring: {
    enabled: boolean;
    interval: number;
    retention: number;
  };
  alerts: {
    enabled: boolean;
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      user: string;
      pass: string;
    };
  };
  logging: {
    level: LogLevel;
    format: string;
    dir: string;
    maxFiles: number;
    maxSize: number;
  };
  metrics: {
    enabled: boolean;
    prefix: string;
    defaultLabels: {
      app: string;
      env: string;
    };
  };
  agent: {
    enabled: boolean;
    version: string;
    updateInterval: number;
    copyFile: string;
  };
  chatModel: {
    provider: string;
    apiKey: string;
    model: ChatModel;
    temperature: number;
    maxTokens: number;
  };
}
