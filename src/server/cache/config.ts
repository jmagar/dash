import { createApiError } from '../../types/error';
import type { LogMetadata } from '../../types/logger';
import { LoggingManager } from '../utils/logging/LoggingManager';
import { validateRedisConfig } from './config/validator';

export interface CacheConfig {
  connection: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    maxRetriesPerRequest?: number;
  };
  memory: {
    limit: string;
    maxKeys: number;
  };
  metrics: {
    interval: number;
  };
}

const DEFAULT_CONFIG: CacheConfig = {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    db: parseInt(process.env.REDIS_DB || '0', 10),
    maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
  },
  memory: {
    limit: process.env.REDIS_MEMORY_LIMIT || '128mb',
    maxKeys: parseInt(process.env.REDIS_MAX_KEYS || '10000', 10),
  },
  metrics: {
    interval: parseInt(process.env.REDIS_METRICS_INTERVAL || '5000', 10),
  },
};

export function validateConfig(config: CacheConfig = DEFAULT_CONFIG): CacheConfig {
  return validateRedisConfig(config);
}

