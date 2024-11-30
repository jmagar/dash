import type { Type } from '@nestjs/common';
import type { ApiPropertyOptions } from '@nestjs/swagger';

// Health status types
export type HealthStatus = 'healthy' | 'unhealthy' | 'degraded';
export type ServiceStatus = 'running' | 'stopped' | 'starting' | 'stopping' | 'degraded';

// Metric types
export type MetricValue = number | string | boolean;
export type MetricType = 'gauge' | 'counter' | 'histogram' | 'summary';

export interface BaseMetric<T extends MetricValue = number> {
  value: T;
  timestamp: Date;
  type: MetricType;
  labels?: Record<string, string>;
}

export interface HealthMetricOptions {
  name: string;
  description?: string;
  type: MetricType;
  unit?: string;
  threshold?: number;
  critical?: boolean;
}

// Health check types
export interface HealthCheckResult {
  status: HealthStatus;
  message?: string;
  timestamp: Date;
  duration?: number;
  error?: Error;
}

export interface ServiceHealthCheck {
  service: string;
  version: string;
  status: ServiceStatus;
  message?: string;
  timestamp: Date;
  duration?: number;
  error?: Error;
  dependencies?: Record<string, HealthCheckResult>;
}

// Metric definitions
export interface MetricDefinition {
  name: string;
  help: string;
  type: MetricType;
  labelNames?: string[];
}

export interface HealthMetricsConfig {
  enabled: boolean;
  interval: number;
  retention: number;
  thresholds: {
    cpu: number;
    memory: number;
    disk: number;
    latency: number;
  };
}

// Type guards
export function isHealthStatus(status: string): status is HealthStatus {
  return ['healthy', 'unhealthy', 'degraded'].includes(status);
}

export function isServiceStatus(status: string): status is ServiceStatus {
  return ['running', 'stopped', 'starting', 'stopping', 'degraded'].includes(status);
}

export function isMetricType(type: string): type is MetricType {
  return ['gauge', 'counter', 'histogram', 'summary'].includes(type);
}

export function isMetricValue(value: unknown): value is MetricValue {
  return typeof value === 'number' || 
         typeof value === 'string' || 
         typeof value === 'boolean';
}

export function isBaseMetric(metric: unknown): metric is BaseMetric {
  if (!metric || typeof metric !== 'object') return false;
  const m = metric as Partial<BaseMetric>;
  
  return isMetricValue(m.value) &&
         m.timestamp instanceof Date &&
         typeof m.type === 'string' &&
         isMetricType(m.type) &&
         (m.labels === undefined || 
          (typeof m.labels === 'object' && 
           Object.values(m.labels).every(v => typeof v === 'string')));
}

// Decorator metadata types
export interface HealthMetricPropertyMetadata {
  propertyKey: string;
  options: HealthMetricOptions;
  apiOptions: ApiPropertyOptions;
  validationOptions?: any[];
  transformOptions?: any[];
}

// Error types
export class HealthCheckError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly check?: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'HealthCheckError';
  }

  static readonly ErrorCodes = {
    CHECK_FAILED: 'CHECK_FAILED',
    TIMEOUT: 'TIMEOUT',
    DEPENDENCY_FAILED: 'DEPENDENCY_FAILED',
    INVALID_METRIC: 'INVALID_METRIC',
    THRESHOLD_EXCEEDED: 'THRESHOLD_EXCEEDED',
  } as const;
}

// Default configurations
export const DEFAULT_HEALTH_CONFIG: HealthMetricsConfig = {
  enabled: true,
  interval: 60000, // 1 minute
  retention: 86400000, // 24 hours
  thresholds: {
    cpu: 80,      // 80% CPU usage
    memory: 85,   // 85% memory usage
    disk: 90,     // 90% disk usage
    latency: 1000 // 1 second latency
  }
} as const;

// Health event types
export interface HealthEvent {
  type: 'status_change' | 'threshold_exceeded' | 'dependency_change';
  timestamp: Date;
  service: string;
  previous?: HealthStatus | ServiceStatus;
  current: HealthStatus | ServiceStatus;
  details?: Record<string, unknown>;
}

// Health notification types
export interface HealthNotification {
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  service: string;
  metadata?: Record<string, unknown>;
}
