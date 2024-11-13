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
    password: process.env.REDIS_PASSWORD,
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
  // Validate memory limit
  const memoryMatch = config.memory.limit.match(/^(\d+)(mb|gb)$/i);
  if (!memoryMatch) {
    const metadata: LogMetadata = {
      limit: config.memory.limit,
      format: 'Expected format: <number>mb or <number>gb',
    };
    logger.warn('Invalid cache memory limit:', metadata);
    throw createApiError('Cache memory limit must be specified in MB or GB', 400, metadata);
  }

  const memoryValue = parseInt(memoryMatch[1], 10);
  const memoryUnit = memoryMatch[2].toLowerCase();
  const memoryInMB = memoryUnit === 'gb' ? memoryValue * 1024 : memoryValue;

  if (memoryInMB < 64) {
    const metadata: LogMetadata = {
      limit: config.memory.limit,
      minimumRequired: '64MB',
    };
    logger.warn('Invalid cache memory limit:', metadata);
    throw createApiError('Cache memory limit must be at least 64MB', 400, metadata);
  }

  // Validate max keys
  if (config.memory.maxKeys < 1000) {
    const metadata: LogMetadata = {
      maxKeys: config.memory.maxKeys,
      minimumRequired: 1000,
    };
    logger.warn('Invalid cache key limit:', metadata);
    throw createApiError('Cache must allow at least 1000 keys', 400, metadata);
  }

  // Validate metrics interval
  if (config.metrics.interval < 1000) {
    const metadata: LogMetadata = {
      interval: config.metrics.interval,
      minimumRequired: 1000,
    };
    logger.warn('Invalid metrics interval:', metadata);
    throw createApiError('Metrics interval must be at least 1 second', 400, metadata);
  }

  // Log successful validation
  logger.info('Cache configuration validated', {
    host: config.connection.host,
    port: config.connection.port,
    memoryLimit: config.memory.limit,
    maxKeys: config.memory.maxKeys,
    metricsInterval: config.metrics.interval,
  });

  return config;
}
