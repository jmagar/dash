import { ApiError, createApiError } from '../../types/error';
import type { LogMetadata } from '../../types/logger';
import { logger } from '../utils/logger';

export interface ConnectionConfig {
  connectionTimeout: number;
  keepAliveInterval: number;
  keepAliveCountMax: number;
  maxRetries: number;
  retryDelay: number;
  maxConnections: number;
  idleTimeout: number;
}

const DEFAULT_CONFIG: ConnectionConfig = {
  connectionTimeout: parseInt(process.env.CONNECTION_TIMEOUT || '5000', 10),
  keepAliveInterval: parseInt(process.env.KEEP_ALIVE_INTERVAL || '5000', 10),
  keepAliveCountMax: parseInt(process.env.KEEP_ALIVE_COUNT_MAX || '3', 10),
  maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
  retryDelay: parseInt(process.env.RETRY_DELAY || '1000', 10),
  maxConnections: parseInt(process.env.MAX_CONNECTIONS || '10', 10),
  idleTimeout: parseInt(process.env.IDLE_TIMEOUT || '30000', 10),
};

export function validateConfig(config: ConnectionConfig = DEFAULT_CONFIG): ConnectionConfig {
  // Validate connection timeout
  if (config.connectionTimeout < 1000) {
    const metadata: LogMetadata = {
      value: config.connectionTimeout,
      minimumRequired: 1000,
    };
    logger.warn('Invalid connection timeout:', metadata);
    throw new ApiError('Connection timeout must be at least 1000ms', undefined, 400, metadata);
  }

  // Validate keep alive interval
  if (config.keepAliveInterval < 1000) {
    const metadata: LogMetadata = {
      value: config.keepAliveInterval,
      minimumRequired: 1000,
    };
    logger.warn('Invalid keep alive interval:', metadata);
    throw new ApiError('Keep alive interval must be at least 1000ms', undefined, 400, metadata);
  }

  // Validate keep alive count max
  if (config.keepAliveCountMax < 1) {
    const metadata: LogMetadata = {
      value: config.keepAliveCountMax,
      minimumRequired: 1,
    };
    logger.warn('Invalid keep alive count max:', metadata);
    throw new ApiError('Keep alive count max must be at least 1', undefined, 400, metadata);
  }

  // Validate max retries
  if (config.maxRetries < 0) {
    const metadata: LogMetadata = {
      value: config.maxRetries,
      minimumRequired: 0,
    };
    logger.warn('Invalid max retries:', metadata);
    throw new ApiError('Max retries cannot be negative', undefined, 400, metadata);
  }

  // Validate retry delay
  if (config.retryDelay < 100) {
    const metadata: LogMetadata = {
      value: config.retryDelay,
      minimumRequired: 100,
    };
    logger.warn('Invalid retry delay:', metadata);
    throw new ApiError('Retry delay must be at least 100ms', undefined, 400, metadata);
  }

  // Validate max connections
  if (config.maxConnections < 1) {
    const metadata: LogMetadata = {
      value: config.maxConnections,
      minimumRequired: 1,
    };
    logger.warn('Invalid max connections:', metadata);
    throw new ApiError('Max connections must be at least 1', undefined, 400, metadata);
  }

  // Validate idle timeout
  if (config.idleTimeout < 1000) {
    const metadata: LogMetadata = {
      value: config.idleTimeout,
      minimumRequired: 1000,
    };
    logger.warn('Invalid idle timeout:', metadata);
    throw new ApiError('Idle timeout must be at least 1000ms', undefined, 400, metadata);
  }

  // Log successful validation
  logger.info('Connection configuration validated', {
    connectionTimeout: config.connectionTimeout,
    keepAliveInterval: config.keepAliveInterval,
    keepAliveCountMax: config.keepAliveCountMax,
    maxRetries: config.maxRetries,
    retryDelay: config.retryDelay,
    maxConnections: config.maxConnections,
    idleTimeout: config.idleTimeout,
  });

  return config;
}

export const connectionConfig = validateConfig();

export default connectionConfig;
