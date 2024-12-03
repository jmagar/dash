import { RedisConfig, RedisError, RedisErrorCode } from '../../../types/redis';
import { logger } from '../../../utils/logger';
import { LoggingManager } from '../../../../../../../../../../utils/logging/LoggingManager';

/**
 * Validates Redis configuration settings
 * @param config - Configuration to validate
 * @returns Validated configuration
 * @throws RedisError if validation fails
 */
export function validateRedisConfig(config: Partial<RedisConfig>): RedisConfig {
  // Connection validation
  if (!config.connection?.host || !config.connection?.port) {
    throw new RedisError({
      code: RedisErrorCode.INVALID_CONFIG,
      message: 'Redis host and port are required',
      metadata: { config: config.connection },
    });
  }

  if (config.connection.port < 1 || config.connection.port > 65535) {
    throw new RedisError({
      code: RedisErrorCode.INVALID_CONFIG,
      message: 'Redis port must be between 1 and 65535',
      metadata: { port: config.connection.port },
    });
  }

  // Memory validation
  if (config.memory?.limit) {
    const memoryMatch = config.memory.limit.match(/^(\d+)(mb|gb)$/i);
    if (!memoryMatch) {
      throw new RedisError({
        code: RedisErrorCode.INVALID_CONFIG,
        message: 'Memory limit must be specified in MB or GB',
        metadata: { limit: config.memory.limit },
      });
    }

    const memoryValue = parseInt(memoryMatch[1], 10);
    if (memoryValue < 1) {
      throw new RedisError({
        code: RedisErrorCode.INVALID_CONFIG,
        message: 'Memory limit must be at least 1MB/GB',
        metadata: { limit: config.memory.limit },
      });
    }
  }

  if (config.memory?.maxKeys !== undefined && config.memory.maxKeys < 1) {
    throw new RedisError({
      code: RedisErrorCode.INVALID_CONFIG,
      message: 'Max keys must be at least 1',
      metadata: { maxKeys: config.memory.maxKeys },
    });
  }

  if (config.memory?.warningThreshold !== undefined &&
      (config.memory.warningThreshold <= 0 || config.memory.warningThreshold >= 1)) {
    throw new RedisError({
      code: RedisErrorCode.INVALID_CONFIG,
      message: 'Warning threshold must be between 0 and 1',
      metadata: { threshold: config.memory.warningThreshold },
    });
  }

  // Metrics validation
  if (config.metrics?.interval !== undefined && config.metrics.interval < 1000) {
    throw new RedisError({
      code: RedisErrorCode.INVALID_CONFIG,
      message: 'Metrics interval must be at least 1000ms',
      metadata: { interval: config.metrics.interval },
    });
  }

  // Retry validation
  if (config.retry) {
    if (config.retry.maxAttempts < 1) {
      throw new RedisError({
        code: RedisErrorCode.INVALID_CONFIG,
        message: 'Max retry attempts must be at least 1',
        metadata: { maxAttempts: config.retry.maxAttempts },
      });
    }

    if (config.retry.initialDelay < 0) {
      throw new RedisError({
        code: RedisErrorCode.INVALID_CONFIG,
        message: 'Initial retry delay must be non-negative',
        metadata: { initialDelay: config.retry.initialDelay },
      });
    }

    if (config.retry.maxDelay < config.retry.initialDelay) {
      throw new RedisError({
        code: RedisErrorCode.INVALID_CONFIG,
        message: 'Max retry delay must be greater than initial delay',
        metadata: { 
          maxDelay: config.retry.maxDelay,
          initialDelay: config.retry.initialDelay 
        },
      });
    }

    if (config.retry.factor <= 1) {
      throw new RedisError({
        code: RedisErrorCode.INVALID_CONFIG,
        message: 'Retry factor must be greater than 1',
        metadata: { factor: config.retry.factor },
      });
    }
  }

  // Serialization validation
  if (!config.serialization?.serialize || !config.serialization?.deserialize) {
    throw new RedisError({
      code: RedisErrorCode.INVALID_CONFIG,
      message: 'Serialization functions are required',
      metadata: { config: config.serialization },
    });
  }

  loggerLoggingManager.getInstance().();
  return config as RedisConfig;
}

