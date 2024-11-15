import { createApiError } from '../../types/error';
import type { LogMetadata } from '../../types/logger';
import { logger } from '../utils/logger';

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
    password: process.env.REDIS_PASSWORD || undefined,
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
  // Validate host
  if (!config.connection.host) {
    const error = createApiError('Redis host is required', null, 400);
    logger.error('Redis host validation failed:', { error: error.message });
    throw error;
  }

  // Validate port
  if (config.connection.port < 1 || config.connection.port > 65535) {
    const metadata: LogMetadata = { port: config.connection.port };
    const error = createApiError('Redis port must be between 1 and 65535', metadata, 400);
    logger.error('Redis port validation failed:', { error: error.message, ...metadata });
    throw error;
  }

  // Validate memory limit
  const memoryMatch = config.memory.limit.match(/^(\d+)(mb|gb)$/i);
  if (!memoryMatch) {
    const metadata: LogMetadata = {
      limit: config.memory.limit,
      format: 'Expected format: <number>mb or <number>gb',
    };
    logger.error('Redis memory limit validation failed:', { error: 'Invalid format', ...metadata });
    throw createApiError('Cache memory limit must be specified in MB or GB', metadata, 400);
  }

  const memoryValue = parseInt(memoryMatch[1], 10);
  if (memoryValue < 1) {
    const metadata: LogMetadata = { limit: config.memory.limit };
    logger.error('Redis memory limit validation failed:', { error: 'Value too small', ...metadata });
    throw createApiError('Cache memory limit must be at least 1MB/GB', metadata, 400);
  }

  // Validate max keys
  if (config.memory.maxKeys < 1) {
    const metadata: LogMetadata = { maxKeys: config.memory.maxKeys };
    logger.error('Redis max keys validation failed:', { error: 'Value too small', ...metadata });
    throw createApiError('Cache max keys must be at least 1', metadata, 400);
  }

  // Validate metrics interval
  if (config.metrics.interval < 1000) {
    const metadata: LogMetadata = { interval: config.metrics.interval };
    logger.error('Redis metrics interval validation failed:', { error: 'Value too small', ...metadata });
    throw createApiError('Cache metrics interval must be at least 1000ms', metadata, 400);
  }

  return config;
}
