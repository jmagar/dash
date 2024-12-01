/**
 * Common type definitions used across the service layer
 */

/**
 * Unique identifier type
 */
export type ID = string;

/**
 * Timestamp type (ISO string)
 */
export type Timestamp = string;

/**
 * Version string type (semver)
 */
export type Version = string;

/**
 * Generic result type
 */
export interface Result<T = void, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}

/**
 * Generic page info for pagination
 */
export interface PageInfo {
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Generic paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  pageInfo: PageInfo;
}

/**
 * Generic key-value pair
 */
export interface KeyValuePair<K = string, V = unknown> {
  key: K;
  value: V;
}

/**
 * Generic metadata type
 */
export interface Metadata {
  [key: string]: unknown;
}

/**
 * Generic filter criteria
 */
export interface FilterCriteria {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'regex';
  value: unknown;
}

/**
 * Generic sort criteria
 */
export interface SortCriteria {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Generic query options
 */
export interface QueryOptions {
  filter?: FilterCriteria[];
  sort?: SortCriteria[];
  page?: number;
  pageSize?: number;
  fields?: string[];
}

/**
 * Generic resource reference
 */
export interface ResourceRef {
  id: ID;
  type: string;
  version?: Version;
}

/**
 * Generic range type
 */
export interface Range<T> {
  start: T;
  end: T;
}

/**
 * Generic time range
 */
export interface TimeRange {
  start: Timestamp;
  end: Timestamp;
}

/**
 * Generic retry options
 */
export interface RetryOptions {
  attempts: number;
  delay: number;
  backoff?: 'fixed' | 'exponential';
  maxDelay?: number;
}

/**
 * Generic cache options
 */
export interface CacheOptions {
  ttl: number;
  staleWhileRevalidate?: boolean;
  namespace?: string;
}

/**
 * Generic batch operation result
 */
export interface BatchResult<T = unknown> {
  success: boolean;
  results: Array<Result<T>>;
  failed: number;
  succeeded: number;
}

/**
 * Generic health check result
 */
export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message?: string;
    duration?: number;
  }>;
}

/**
 * Generic feature flag
 */
export interface FeatureFlag {
  name: string;
  enabled: boolean;
  conditions?: Record<string, unknown>;
}

/**
 * Generic rate limit config
 */
export interface RateLimitConfig {
  limit: number;
  window: number;
  strategy?: 'fixed' | 'sliding';
}

/**
 * Generic circuit breaker config
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  halfOpenRequests?: number;
}
