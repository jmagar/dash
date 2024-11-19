import { load } from 'js-yaml';
import { readFileSync } from 'fs';
import { join } from 'path';

interface Config {
  server: {
    port: number;
    host: string;
    maxRequestSize: number;
  };
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
    ssl: boolean;
  };
  redis: {
    host: string;
    port: number;
    password: string;
  };
  auth: {
    jwtSecret: string;
    jwtExpiry: string;
    jwtRefreshExpiry: string;
  };
  security: {
    cors: {
      origin: string;
      methods: string[];
      allowedHeaders: string[];
      credentials: boolean;
      maxAge: number;
    };
    rateLimit: {
      window: number;
      max: number;
    };
  };
  monitoring: {
    prometheusPort: number;
    logLevel: string;
    syslogPort: number;
  };
  storage: {
    dataDir: string;
  };
}

function loadConfig(): Config {
  const configPath = join(__dirname, '../config/config.yaml');
  const configFile = readFileSync(configPath, 'utf8');
  
  // Replace environment variables
  const configWithEnv = configFile.replace(/\${(\w+)}/g, (_, key) => {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  });

  return load(configWithEnv) as Config;
}

// Load and validate configuration
const config = loadConfig();

// Validate required fields
const requiredEnvVars = ['POSTGRES_PASSWORD', 'JWT_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export default config;
