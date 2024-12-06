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
 * Generic result type with improved error handling
 */
export interface Result<T = void, E extends Error = Error> {
  success: boolean;
  data?: T;
  error?: E;
  metadata?: Metadata;
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
  totalPages: number;
}

/**
 * Generic paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  pageInfo: PageInfo;
  metadata?: Metadata;
}

/**
 * Generic key-value pair
 */
export interface KeyValuePair<K = string, V = unknown> {
  key: K;
  value: V;
  metadata?: Metadata;
}

/**
 * Generic metadata type
 */
export interface Metadata {
  [key: string]: unknown;
}

/**
 * Filter operators
 */
export type FilterOperator = 
  | 'eq' 
  | 'ne' 
  | 'gt' 
  | 'gte' 
  | 'lt' 
  | 'lte' 
  | 'in' 
  | 'nin' 
  | 'regex'
  | 'exists'
  | 'notExists';

/**
 * Generic filter criteria
 */
export interface FilterCriteria {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

/**
 * Sort direction type
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Generic sort criteria
 */
export interface SortCriteria {
  field: string;
  direction: SortDirection;
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
  include?: string[];
  metadata?: Metadata;
}

/**
 * Generic resource reference
 */
export interface ResourceRef {
  id: ID;
  type: string;
  version?: Version;
  metadata?: Metadata;
}

/**
 * Generic range type
 */
export interface Range<T> {
  start: T;
  end: T;
  inclusive?: boolean;
}

/**
 * Generic time range
 */
export interface TimeRange extends Range<Timestamp> {
  timezone?: string;
}

/**
 * Backoff strategy type
 */
export type BackoffStrategy = 'fixed' | 'exponential' | 'fibonacci';

/**
 * Generic retry options
 */
export interface RetryOptions {
  attempts: number;
  delay: number;
  backoff?: BackoffStrategy;
  maxDelay?: number;
  timeout?: number;
}

/**
 * Generic cache options
 */
export interface CacheOptions {
  ttl: number;
  staleWhileRevalidate?: boolean;
  namespace?: string;
  tags?: string[];
}

/**
 * Generic batch operation result
 */
export interface BatchResult<T = unknown> {
  success: boolean;
  results: Array<Result<T>>;
  failed: number;
  succeeded: number;
  metadata?: Metadata;
}

/**
 * Health status type
 */
export type HealthStatus = 'healthy' | 'unhealthy' | 'degraded';

/**
 * Health check status type
 */
export type HealthCheckStatus = 'pass' | 'fail' | 'warn';

/**
 * Generic health check result
 */
export interface HealthCheckResult {
  status: HealthStatus;
  checks: Array<{
    name: string;
    status: HealthCheckStatus;
    message?: string;
    duration?: number;
    metadata?: Metadata;
  }>;
  timestamp: Timestamp;
}

/**
 * Generic feature flag
 */
export interface FeatureFlag {
  name: string;
  enabled: boolean;
  conditions?: Record<string, unknown>;
  metadata?: Metadata;
}

/**
 * Rate limit strategy type
 */
export type RateLimitStrategy = 'fixed' | 'sliding' | 'token-bucket';

/**
 * Generic rate limit config
 */
export interface RateLimitConfig {
  limit: number;
  window: number;
  strategy?: RateLimitStrategy;
  metadata?: Metadata;
}

/**
 * Generic circuit breaker config
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  halfOpenRequests?: number;
  metadata?: Metadata;
}

// Constants
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_CACHE_TTL = 3600; // 1 hour
export const DEFAULT_RETRY_ATTEMPTS = 3;
export const DEFAULT_RETRY_DELAY = 1000; // 1 second

// Type guards
export function isResult<T>(obj: unknown): obj is Result<T> {
  return obj !== null &&
    typeof obj === 'object' &&
    'success' in obj;
}

export function isPaginatedResponse<T>(obj: unknown): obj is PaginatedResponse<T> {
  return obj !== null &&
    typeof obj === 'object' &&
    'items' in obj &&
    'pageInfo' in obj &&
    Array.isArray((obj as PaginatedResponse<T>).items);
}

export function isFilterCriteria(obj: unknown): obj is FilterCriteria {
  return obj !== null &&
    typeof obj === 'object' &&
    'field' in obj &&
    'operator' in obj &&
    'value' in obj;
}

export function isHealthCheckResult(obj: unknown): obj is HealthCheckResult {
  return obj !== null &&
    typeof obj === 'object' &&
    'status' in obj &&
    'checks' in obj &&
    Array.isArray((obj as HealthCheckResult).checks);
}

// Validation functions
export function validatePageSize(size: number): number {
  return Math.min(Math.max(1, size), MAX_PAGE_SIZE);
}

export function validateTimestamp(timestamp: string): boolean {
  return !isNaN(Date.parse(timestamp));
}

export function validateVersion(version: string): boolean {
  return /^\d+\.\d+\.\d+(?:-[\w.]+)?(?:\+[\w.]+)?$/.test(version);
}
