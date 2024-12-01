import { ServiceStatus } from './status';

/**
 * Base service configuration interface
 */
export interface BaseServiceConfig {
  name: string;
  version: string;
  description?: string;
  dependencies?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Service lifecycle configuration
 */
export interface ServiceLifecycleConfig {
  startTimeout?: number;
  stopTimeout?: number;
  restartDelay?: number;
  maxRestarts?: number;
  gracefulShutdown?: boolean;
}

/**
 * Service health check configuration
 */
export interface ServiceHealthConfig {
  enabled?: boolean;
  interval?: number;
  timeout?: number;
  retries?: number;
  thresholds?: {
    cpu?: number;
    memory?: number;
    latency?: number;
    errorRate?: number;
  };
}

/**
 * Service recovery configuration
 */
export interface ServiceRecoveryConfig {
  enabled?: boolean;
  strategies?: Array<{
    status: ServiceStatus;
    action: 'restart' | 'notify' | 'escalate';
    delay?: number;
    maxAttempts?: number;
  }>;
}

/**
 * Complete service configuration
 */
export interface ServiceConfig extends BaseServiceConfig {
  lifecycle?: ServiceLifecycleConfig;
  health?: ServiceHealthConfig;
  recovery?: ServiceRecoveryConfig;
}

/**
 * Default configuration values
 */
export const DEFAULT_SERVICE_CONFIG: Partial<ServiceConfig> = {
  version: '1.0.0',
  lifecycle: {
    startTimeout: 30000,
    stopTimeout: 30000,
    restartDelay: 5000,
    maxRestarts: 3,
    gracefulShutdown: true
  },
  health: {
    enabled: true,
    interval: 60000,
    timeout: 5000,
    retries: 3,
    thresholds: {
      cpu: 80,
      memory: 80,
      latency: 1000,
      errorRate: 0.1
    }
  },
  recovery: {
    enabled: true,
    strategies: [
      {
        status: ServiceStatus.ERROR,
        action: 'restart',
        delay: 1000,
        maxAttempts: 3
      },
      {
        status: ServiceStatus.DEGRADED,
        action: 'notify',
        delay: 0
      }
    ]
  }
};
