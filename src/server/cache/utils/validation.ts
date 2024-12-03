import { RedisError, RedisErrorCode } from '../../../types/redis';
import type { LogMetadata } from '../../../types/logger';
import { logger } from '../../services/logger';

/**
 * Validates a Redis cache key
 */
export function validateKey(key: string, context: string = 'key'): void {
  if (!key?.trim()) {
    throw new RedisError({
      code: RedisErrorCode.INVALID_KEY,
      message: `Invalid ${context}`,
      metadata: { key },
    });
  }

  if (key.length > 512) {
    throw new RedisError({
      code: RedisErrorCode.KEY_TOO_LONG,
      message: `${context} exceeds maximum length`,
      metadata: { keyLength: key.length, key },
    });
  }
}

/**
 * Serializes data to string
 */
export function serialize<T>(data: T): string {
  try {
    return JSON.stringify(data);
  } catch (error) {
    throw new RedisError({
      code: RedisErrorCode.SERIALIZATION_ERROR,
      message: 'Failed to serialize data',
      metadata: { error: (error as Error).message },
    });
  }
}

/**
 * Deserializes string data to type T
 */
export function deserialize<T>(data: string): T {
  try {
    return JSON.parse(data) as T;
  } catch (error) {
    throw new RedisError({
      code: RedisErrorCode.SERIALIZATION_ERROR,
      message: 'Failed to deserialize data',
      metadata: { error: (error as Error).message },
    });
  }
}

/**
 * Validates Redis key format
 */
export function validateKeyFormat(key: string, prefix: string): void {
  if (!key.startsWith(prefix)) {
    throw new RedisError({
      code: RedisErrorCode.INVALID_KEY_FORMAT,
      message: `Key must start with ${prefix}`,
      metadata: { key, prefix },
    });
  }
}

/**
 * Validates Redis value
 */
export function validateValue(value: unknown): void {
  if (value === undefined || value === null) {
    throw new RedisError({
      code: RedisErrorCode.INVALID_VALUE,
      message: 'Value cannot be null or undefined',
      metadata: { value },
    });
  }
}

/**
 * Validates Redis TTL
 */
export function validateTTL(ttl: number): void {
  if (ttl <= 0) {
    throw new RedisError({
      code: RedisErrorCode.INVALID_TTL,
      message: 'TTL must be positive',
      metadata: { ttl },
    });
  }
}
