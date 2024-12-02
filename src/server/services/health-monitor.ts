import { Injectable } from '@nestjs/common';
import { BaseService } from './base-service';
import { ServiceStatus } from '../types/status';
import { ServiceEvent, ServiceHealthEvent } from '../types/events';
import { ServiceConfig } from '../types/service-config';
import { HealthCheckResult } from '../types/common';
import { EventEmitter } from 'events';

interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message?: string;
  timestamp: Date;
  duration?: number;
}

interface ServiceHealthState {
  status: ServiceStatus;
  lastCheck?: Date;
  checks: HealthCheck[];
  metrics: {
    cpu?: number;
    memory?: number;
    latency?: number;
    errorRate?: number;
  };
}

interface HealthMonitorConfig {
  checkInterval: number;
  timeout: number;
  thresholds: {
    cpu: number;
    memory: number;
    latency: number;
    errorRate: number;
  };
}

const DEFAULT_HEALTH_CONFIG: HealthMonitorConfig = {
  checkInterval: 30000,
  timeout: 5000,
  thresholds: {
    cpu: 80,
    memory: 80,
    latency: 1000,
    errorRate: 0.1
  }
};

@Injectable()
export class HealthMonitorService extends BaseService {
  private readonly healthEmitter: EventEmitter;
  private readonly services: Map<string, ServiceHealthState>;
  private readonly config: HealthMonitorConfig;
  private checkInterval?: NodeJS.Timeout;

  constructor(
    config: ServiceConfig & { health?: Partial<HealthMonitorConfig> }
  ) {
    super({
      name: 'health-monitor',
      version: '1.0.0',
      ...config
    });

    this.healthEmitter = new EventEmitter();
    this.services = new Map();
    this.config = {
      ...DEFAULT_HEALTH_CONFIG,
      ...config.health
    };
  }

  /**
   * Register a service for health monitoring
   */
  registerService(serviceName: string): void {
    this.services.set(serviceName, {
      status: ServiceStatus.STOPPED,
      checks: [],
      metrics: {}
    });
  }

  /**
   * Unregister a service from health monitoring
   */
  unregisterService(serviceName: string): void {
    this.services.delete(serviceName);
  }

  /**
   * Get health status for a service
   */
  getServiceHealth(serviceName: string): ServiceHealthState | undefined {
    return this.services.get(serviceName);
  }

  /**
   * Update service health status
   */
  updateServiceHealth(
    serviceName: string,
    status: ServiceStatus,
    checks: HealthCheck[] = []
  ): void {
    const healthState = this.services.get(serviceName);
    if (healthState) {
      const previousStatus = healthState.status;
      healthState.status = status;
      healthState.lastCheck = new Date();
      healthState.checks = checks;

      const event: ServiceHealthEvent = {
        id: `health-${Date.now()}`,
        timestamp: new Date(),
        serviceName,
        type: 'service:health',
        payload: {
          status,
          checks
        }
      };

      this.emit(event);
    }
  }

  /**
   * Update service metrics
   */
  updateServiceMetrics(
    serviceName: string,
    metrics: Partial<ServiceHealthState['metrics']>
  ): void {
    const healthState = this.services.get(serviceName);
    if (healthState) {
      healthState.metrics = {
        ...healthState.metrics,
        ...metrics
      };
    }
  }

  protected async onStart(): Promise<void> {
    this.checkInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.config.checkInterval);
  }

  protected async onStop(): Promise<void> {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
  }

  private async performHealthChecks(): Promise<void> {
    for (const [serviceName, healthState] of this.services) {
      const checks: HealthCheck[] = [];

      // Check resource metrics
      if (healthState.metrics.cpu !== undefined) {
        checks.push({
          name: 'cpu',
          status: healthState.metrics.cpu > this.config.thresholds.cpu ? 'warn' : 'pass',
          message: `CPU usage: ${healthState.metrics.cpu}%`,
          timestamp: new Date()
        });
      }

      if (healthState.metrics.memory !== undefined) {
        checks.push({
          name: 'memory',
          status: healthState.metrics.memory > this.config.thresholds.memory ? 'warn' : 'pass',
          message: `Memory usage: ${healthState.metrics.memory}%`,
          timestamp: new Date()
        });
      }

      if (healthState.metrics.latency !== undefined) {
        checks.push({
          name: 'latency',
          status: healthState.metrics.latency > this.config.thresholds.latency ? 'warn' : 'pass',
          message: `Latency: ${healthState.metrics.latency}ms`,
          timestamp: new Date()
        });
      }

      if (healthState.metrics.errorRate !== undefined) {
        checks.push({
          name: 'error-rate',
          status: healthState.metrics.errorRate > this.config.thresholds.errorRate ? 'warn' : 'pass',
          message: `Error rate: ${healthState.metrics.errorRate}`,
          timestamp: new Date()
        });
      }

      // Update service health based on checks
      const status = checks.some(check => check.status === 'fail')
        ? ServiceStatus.ERROR
        : checks.some(check => check.status === 'warn')
        ? ServiceStatus.DEGRADED
        : ServiceStatus.RUNNING;

      this.updateServiceHealth(serviceName, status, checks);
    }
  }
}
