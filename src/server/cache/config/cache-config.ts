import { RedisConfig, RedisErrorCode } from '../../../types/redis';
import { RedisError } from '../../../types/redis';

const DEFAULT_CONFIG: RedisConfig = {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  },
  memory: {
    limit: process.env.REDIS_MEMORY_LIMIT || '512mb',
    maxKeys: parseInt(process.env.REDIS_MAX_KEYS || '100000', 10),
    evictionPolicy: 'volatile-lru',
    warningThreshold: 0.8,
  },
  metrics: {
    enabled: true,
    interval: parseInt(process.env.REDIS_METRICS_INTERVAL || '60000', 10),
    detailed: process.env.REDIS_DETAILED_METRICS === 'true',
  },
  retry: {
    maxAttempts: parseInt(process.env.REDIS_MAX_RETRIES || '5', 10),
    initialDelay: parseInt(process.env.REDIS_INITIAL_DELAY || '100', 10),
    maxDelay: parseInt(process.env.REDIS_MAX_DELAY || '2000', 10),
    factor: parseFloat(process.env.REDIS_RETRY_FACTOR || '2'),
  },
  serialization: {
    serialize: <T>(data: T): string => JSON.stringify(data),
    deserialize: <T>(data: string): T => JSON.parse(data),
  },
};

export function validateConfig(config: Partial<RedisConfig>): RedisConfig {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // Validate connection config
  if (!mergedConfig.connection.host || !mergedConfig.connection.port) {
    throw new RedisError({
      code: RedisErrorCode.INVALID_CONFIG,
      message: 'Redis host and port are required',
      status: 400,
      metadata: {
        service: 'CacheConfig',
        operation: 'validateConfig',
        config: mergedConfig.connection,
      },
    });
  }

  // Validate memory config
  try {
    const memoryLimit = parseInt(mergedConfig.memory.limit);
    if (isNaN(memoryLimit) || memoryLimit <= 0) {
      throw new RedisError({
        code: RedisErrorCode.INVALID_CONFIG,
        message: 'Invalid memory limit configuration',
        status: 400,
        metadata: {
          service: 'CacheConfig',
          operation: 'validateConfig',
          limit: mergedConfig.memory.limit,
        },
      });
    }

    if (mergedConfig.memory.maxKeys <= 0) {
      throw new RedisError({
        code: RedisErrorCode.INVALID_CONFIG,
        message: 'Invalid max keys configuration',
        status: 400,
        metadata: {
          service: 'CacheConfig',
          operation: 'validateConfig',
          maxKeys: mergedConfig.memory.maxKeys,
        },
      });
    }

    if (mergedConfig.memory.warningThreshold !== undefined &&
        (mergedConfig.memory.warningThreshold <= 0 || mergedConfig.memory.warningThreshold >= 1)) {
      throw new RedisError({
        code: RedisErrorCode.INVALID_CONFIG,
        message: 'Warning threshold must be between 0 and 1',
        status: 400,
        metadata: {
          service: 'CacheConfig',
          operation: 'validateConfig',
          warningThreshold: mergedConfig.memory.warningThreshold,
        },
      });
    }
  } catch (error) {
    if (error instanceof RedisError) throw error;
    throw new RedisError({
      code: RedisErrorCode.INVALID_CONFIG,
      message: 'Failed to validate memory configuration',
      cause: error,
      status: 400,
      metadata: {
        service: 'CacheConfig',
        operation: 'validateConfig',
        config: mergedConfig.memory,
      },
    });
  }

  // Validate metrics config
  if (mergedConfig.metrics.interval < 1000) {
    throw new RedisError({
      code: RedisErrorCode.INVALID_CONFIG,
      message: 'Metrics interval must be at least 1000ms',
      status: 400,
      metadata: {
        service: 'CacheConfig',
        operation: 'validateConfig',
        interval: mergedConfig.metrics.interval,
      },
    });
  }

  // Validate retry config
  if (
    mergedConfig.retry.maxAttempts < 1 ||
    mergedConfig.retry.initialDelay < 0 ||
    mergedConfig.retry.maxDelay < mergedConfig.retry.initialDelay ||
    mergedConfig.retry.factor <= 1
  ) {
    throw new RedisError({
      code: RedisErrorCode.INVALID_CONFIG,
      message: 'Invalid retry configuration',
      status: 400,
      metadata: {
        service: 'CacheConfig',
        operation: 'validateConfig',
        config: mergedConfig.retry,
      },
    });
  }

  // Validate serialization config
  if (!mergedConfig.serialization?.serialize || !mergedConfig.serialization?.deserialize) {
    throw new RedisError({
      code: RedisErrorCode.INVALID_CONFIG,
      message: 'Serialization functions are required',
      status: 400,
      metadata: {
        service: 'CacheConfig',
        operation: 'validateConfig',
      },
    });
  }

  return mergedConfig;
}

export function getConfig(overrides?: Partial<RedisConfig>): RedisConfig {
  try {
    return validateConfig(overrides || {});
  } catch (error) {
    if (error instanceof RedisError) throw error;
    throw new RedisError({
      code: RedisErrorCode.INVALID_CONFIG,
      message: 'Failed to generate Redis configuration',
      cause: error,
      status: 400,
      metadata: {
        service: 'CacheConfig',
        operation: 'getConfig',
        overrides,
      },
    });
  }
}

export default DEFAULT_CONFIG;

export const CACHE_KEYS = {
  FILE_SYSTEM_STATE: 'fs:state',
  PROCESS_STATE: 'process:state',
  NETWORK_STATE: 'network:state',
  USER_STATE: 'user:state',
  APP_STATE: 'app:state',
  SYSTEM_STATE: 'system:state',
} as const;

export const CACHE_TTL = {
  STATE: 60 * 60 * 1000, // 1 hour
} as const;
