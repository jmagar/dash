import { createApiError } from '../../types/error';
import type { LogMetadata } from '../../types/logger';
import { logger } from '../utils/logger';

interface CacheConfig {
  connection: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  limits: {
    maxMemoryMB: number;
    maxKeys: number;
  };
  monitoring: {
    metricsInterval: number;
  };
}

export const KEY_PREFIXES = {
  SESSION: 'session:',
  HOST: 'host:',
  COMMAND: 'command:',
  DOCKER: {
    CONTAINERS: 'docker:containers:',
    STACKS: 'docker:stacks:',
  },
} as const;

export const TTL_CONFIG = {
  SESSION: 24 * 60 * 60, // 24 hours
  HOST: 5 * 60, // 5 minutes
  COMMAND: 7 * 24 * 60 * 60, // 7 days
  DOCKER: 5 * 60, // 5 minutes
} as const;

const DEFAULT_CONFIG: CacheConfig = {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  limits: {
    maxMemoryMB: parseInt(process.env.REDIS_MAX_MEMORY_MB || '128', 10),
    maxKeys: parseInt(process.env.REDIS_MAX_KEYS || '10000', 10),
  },
  monitoring: {
    metricsInterval: parseInt(process.env.REDIS_METRICS_INTERVAL || '5000', 10),
  },
};

export function validateConfig(config: CacheConfig = DEFAULT_CONFIG): CacheConfig {
  // Validate memory limit
  if (config.limits.maxMemoryMB < 64) {
    const metadata: LogMetadata = {
      value: config.limits.maxMemoryMB,
      minimumRequired: 64,
    };
    logger.warn('Invalid cache memory limit:', metadata);
    throw createApiError('Cache memory limit must be at least 64MB', 400, metadata);
  }

  // Validate key limit
  if (config.limits.maxKeys < 1000) {
    const metadata: LogMetadata = {
      value: config.limits.maxKeys,
      minimumRequired: 1000,
    };
    logger.warn('Invalid cache key limit:', metadata);
    throw createApiError('Cache must allow at least 1000 keys', 400, metadata);
  }

  // Validate metrics interval
  if (config.monitoring.metricsInterval < 1000) {
    const metadata: LogMetadata = {
      value: config.monitoring.metricsInterval,
      minimumRequired: 1000,
    };
    logger.warn('Invalid metrics interval:', metadata);
    throw createApiError('Metrics interval must be at least 1 second', 400, metadata);
  }

  // Log successful validation
  logger.info('Cache configuration validated', {
    host: config.connection.host,
    port: config.connection.port,
    maxMemoryMB: config.limits.maxMemoryMB,
    maxKeys: config.limits.maxKeys,
    metricsInterval: config.monitoring.metricsInterval,
  });

  return config;
}

export const cacheConfig = validateConfig();

export default cacheConfig;
