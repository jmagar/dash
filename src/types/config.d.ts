export interface Config {
  env: string;
  port: number;
  host: string;
  db: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  openai: {
    apiKey: string;
    model: string;
    organization?: string;
    maxTokens?: number;
    temperature?: number;
  };
  openrouter: {
    apiKey: string;
    model: string;
    baseUrl: string;
    maxTokens?: number;
    temperature?: number;
  };
  logging: {
    level: string;
    file: string;
  };
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  prometheus: {
    port: number;
  };
}
