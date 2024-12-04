import { JsonValue } from '../managers/types/manager.types';

export type CacheKey = string;
export type CacheValue = JsonValue;

export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  size: number;
  lastAccess?: Date;
}

export interface CacheHealth {
  status: 'healthy' | 'degraded' | 'error';
  details: {
    size: number;
    stats: CacheStats;
    redis: {
      connected: boolean;
      usedMemory?: number;
      lastPing?: number;
    };
  };
}

export interface CacheClient {
  set(key: CacheKey, value: CacheValue, ttl?: number): Promise<void>;
  get<T extends CacheValue>(key: CacheKey): Promise<T | undefined>;
  delete(key: CacheKey): Promise<void>;
  clear(): Promise<void>;
  getStats(): CacheStats;
  healthCheck(): Promise<CacheHealth>;
  cleanup(): Promise<void>;
}
