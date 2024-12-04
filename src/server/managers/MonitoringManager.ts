// Node.js built-in modules
import { EventEmitter } from 'events';
import { setTimeout, clearTimeout } from 'timers';

// External libraries
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';

// Local imports
import { BaseService } from '../services/base.service';
import { MetricsManager } from './MetricsManager';
import { LoggingManager } from './LoggingManager';
import { ConfigManager } from './ConfigManager';
import { ServiceHealth, ServiceStatus } from '../types/service.types';
import { BaseManagerDependencies } from './ManagerContainer';

// Enhanced Type Definitions
export type AlertType = 'error' | 'warning' | 'info';
export type AlertFilter = Partial<{
  type: AlertType;
  source: string;
  acknowledged: boolean;
  from: Date;
  to: Date;
}>;

// Strict Zod Schemas with Comprehensive Validation
const HealthCheckSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Name must not be empty"),
  interval: z.number().positive().min(1000, "Interval must be at least 1 second"),
  timeout: z.number().positive().max(60000, "Timeout must be less than 1 minute"),
  check: z.function().returns(z.promise(z.boolean())),
  lastRun: z.date().optional(),
  lastStatus: z.boolean().optional(),
  nextRun: z.date().optional(),
  failureThreshold: z.number().int().min(1).max(10).default(3),
  consecutiveFailures: z.number().int().min(0).default(0)
}).strict();

const AlertSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['error', 'warning', 'info']),
  message: z.string().min(1, "Alert message must not be empty"),
  source: z.string().min(1, "Alert source must not be empty"),
  timestamp: z.date(),
  metadata: z.record(z.any()).optional(),
  acknowledged: z.boolean().optional().default(false),
  acknowledgedBy: z.string().optional(),
  acknowledgedAt: z.date().optional(),
  severity: z.number().int().min(1).max(10).optional().default(5)
}).strict();

const MonitoringConfigSchema = z.object({
  alertRetentionDays: z.number().int().min(1).max(365).default(30),
  maxAlerts: z.number().int().min(10).max(10000).default(1000),
  globalHealthCheckTimeout: z.number().int().min(1000).max(60000).default(30000),
  enableAlertPersistence: z.boolean().default(true),
  alertCleanupInterval: z.number().int().min(60000).max(86400000).default(3600000) // 1 hour
}).strict();

// Dependency Injection Interface
export interface MonitoringManagerDependencies {
  configManager?: ConfigManager;
  metricsManager?: MetricsManager;
  loggingManager?: LoggingManager;
}

type HealthCheck = z.infer<typeof HealthCheckSchema>;
type Alert = z.infer<typeof AlertSchema>;
type MonitoringConfig = z.infer<typeof MonitoringConfigSchema>;

@Injectable()
export class MonitoringManager extends BaseService {
  private static instance: MonitoringManager;
  
  // Core monitoring components
  private readonly healthChecks: Map<string, HealthCheck>;
  private readonly alerts: Alert[];
  private readonly checkIntervals: Map<string, NodeJS.Timeout>;
  private readonly eventEmitter: EventEmitter;

  // Dependency managers with optional injection
  private configManager?: ConfigManager;
  private metricsManager?: MetricsManager;
  private loggingManager?: LoggingManager;

  // Configuration parameters
  private readonly config: MonitoringConfig;

  // Metrics trackers with proper typing
  private readonly healthCheckMetric: ReturnType<MetricsManager['createGauge']>;
  private readonly failingHealthCheckMetric: ReturnType<MetricsManager['createGauge']>;
  private readonly alertMetric: ReturnType<MetricsManager['createGauge']>;
  private readonly unacknowledgedAlertMetric: ReturnType<MetricsManager['createGauge']>;
  private readonly checkDurationMetric: ReturnType<MetricsManager['createHistogram']>;
  private readonly alertSeverityMetric: ReturnType<MetricsManager['createGauge']>;

  private alertCleanupInterval?: NodeJS.Timeout;

  private constructor() {
    super({
      name: 'MonitoringManager',
      version: '1.0.0',
      dependencies: ['ConfigManager', 'MetricsManager', 'LoggingManager']
    });

    // Initialize core monitoring components
    this.healthChecks = new Map();
    this.alerts = [];
    this.checkIntervals = new Map();
    this.eventEmitter = new EventEmitter();
  }

  public static getInstance(): MonitoringManager {
    if (!MonitoringManager.instance) {
      MonitoringManager.instance = new MonitoringManager();
    }
    return MonitoringManager.instance;
  }

  // New initialization method for dependency injection
  public initialize(deps: BaseManagerDependencies): void {
    this.configManager = deps.configManager;
    this.metricsManager = deps.metricsManager;
    this.loggingManager = deps.loggingManager;
  }

  public async init(): Promise<void> {
    try {
      // Use injected dependencies
      this.loggingManager?.info('Monitoring Manager initializing');
      
      // Load and validate configuration
      const rawConfig = this.configManager?.getConfig('monitoring', {});
      this.config = MonitoringConfigSchema.parse(rawConfig);

      // Setup metrics
      this.healthCheckMetric = this.setupHealthCheckMetrics();
      this.failingHealthCheckMetric = this.setupFailingHealthCheckMetrics();
      this.alertMetric = this.setupAlertMetrics();
      this.unacknowledgedAlertMetric = this.setupUnacknowledgedAlertMetrics();
      this.checkDurationMetric = this.setupCheckDurationMetrics();
      this.alertSeverityMetric = this.setupAlertSeverityMetrics();

      // Load persisted alerts and health checks
      await this.loadPersistedData();

      // Start all registered health checks
      for (const check of this.healthChecks.values()) {
        await this.startHealthCheck(check);
      }

      // Setup alert cleanup if enabled
      if (this.config.enableAlertPersistence) {
        this.setupAlertCleanup();
      }

      this.loggingManager?.info('MonitoringManager initialized successfully', {
        healthChecks: this.healthChecks.size,
        alerts: this.alerts.length,
        config: this.config
      });
    } catch (error) {
      const typedError = error instanceof Error ? error : new Error(String(error));
      this.loggingManager?.error('Failed to initialize MonitoringManager', { 
        error: typedError.message,
        stack: typedError.stack 
      });
      throw typedError;
    }
  }

  private async loadPersistedData(): Promise<void> {
    // Implement data persistence loading logic
    // This could involve reading from a database or file
  }

  private setupAlertCleanup(): void {
    this.alertCleanupInterval = setInterval(() => {
      const cutoffDate = new Date(Date.now() - this.config.alertRetentionDays * 24 * 60 * 60 * 1000);
      const initialLength = this.alerts.length;

      // Remove alerts older than retention period
      this.alerts.splice(0, this.alerts.findIndex(alert => alert.timestamp > cutoffDate));

      if (initialLength !== this.alerts.length) {
        this.loggingManager?.info('Cleaned up old alerts', {
          removedCount: initialLength - this.alerts.length
        });
      }
    }, this.config.alertCleanupInterval);
  }

  public async cleanup(): Promise<void> {
    try {
      // Stop all health check intervals
      for (const interval of this.checkIntervals.values()) {
        clearTimeout(interval);
      }
      this.checkIntervals.clear();

      // Stop alert cleanup interval
      if (this.alertCleanupInterval) {
        clearInterval(this.alertCleanupInterval);
      }

      // Persist alerts if needed
      await this.persistAlerts();

      this.loggingManager?.info('MonitoringManager cleanup completed');
    } catch (error) {
      const typedError = error instanceof Error ? error : new Error(String(error));
      this.loggingManager?.error('Failed to cleanup MonitoringManager', { 
        error: typedError.message,
        stack: typedError.stack 
      });
      throw typedError;
    }
  }

  private async persistAlerts(): Promise<void> {
    // Implement alert persistence logic
    // This could involve writing to a database or file
  }

  public async getHealth(): Promise<ServiceHealth> {
    try {
      const failingChecks = Array.from(this.healthChecks.values()).filter(check => !check.lastStatus);
      const unacknowledgedAlerts = this.alerts.filter(alert => !alert.acknowledged);

      return {
        status: failingChecks.length > 0 ? ServiceStatus.DEGRADED : ServiceStatus.HEALTHY,
        version: this.version,
        details: {
          totalHealthChecks: this.healthChecks.size,
          failingHealthChecks: failingChecks.length,
          totalAlerts: this.alerts.length,
          unacknowledgedAlerts: unacknowledgedAlerts.length,
          config: this.config
        }
      };
    } catch (error) {
      const typedError = error instanceof Error ? error : new Error(String(error));
      this.loggingManager?.error('Failed to get health status', { 
        error: typedError.message,
        stack: typedError.stack 
      });
      return {
        status: ServiceStatus.UNHEALTHY,
        version: this.version,
        details: { error: typedError.message }
      };
    }
  }

  public registerHealthCheck(
    name: string,
    check: () => Promise<boolean>,
    interval: number = 60000,
    timeout: number = this.config.globalHealthCheckTimeout,
    failureThreshold: number = 3
  ): string {
    const healthCheck: HealthCheck = {
      id: uuidv4(),
      name,
      check,
      interval,
      timeout,
      failureThreshold,
      consecutiveFailures: 0
    };

    // Validate health check
    HealthCheckSchema.parse(healthCheck);

    this.healthChecks.set(healthCheck.id, healthCheck);
    this.startHealthCheck(healthCheck);

    this.loggingManager?.info('Health check registered', { 
      name, 
      interval, 
      timeout 
    });

    return healthCheck.id;
  }

  private async startHealthCheck(check: HealthCheck): Promise<void> {
    const runCheck = async () => {
      const startTime = Date.now();
      try {
        const result = await Promise.race([
          check.check(),
          new Promise<boolean>((_, reject) => 
            setTimeout(() => reject(new Error('Health check timed out')), check.timeout)
          )
        ]);

        const duration = (Date.now() - startTime) / 1000;
        this.checkDurationMetric.observe({ service: check.name }, duration);

        check.lastRun = new Date();
        check.lastStatus = result;
        check.consecutiveFailures = result ? 0 : check.consecutiveFailures + 1;

        if (check.consecutiveFailures >= check.failureThreshold) {
          this.createAlert(
            'warning', 
            `Health check ${check.name} failed ${check.consecutiveFailures} times`, 
            'HealthCheck',
            { checkId: check.id }
          );
        }

        this.updateHealthCheckMetrics();
      } catch (error) {
        this.loggingManager?.error('Health check failed', { 
          name: check.name, 
          error 
        });

        check.lastStatus = false;
        check.consecutiveFailures++;

        if (check.consecutiveFailures >= check.failureThreshold) {
          this.createAlert(
            'error', 
            `Health check ${check.name} consistently failing`, 
            'HealthCheck',
            { 
              checkId: check.id,
              error: String(error)
            }
          );
        }
      }

      check.nextRun = new Date(Date.now() + check.interval);
    };

    // Initial run
    await runCheck();

    // Schedule periodic checks
    const interval = setInterval(runCheck, check.interval);
    this.checkIntervals.set(check.id, interval);
  }

  public createAlert(
    type: AlertType,
    message: string,
    source: string,
    metadata?: Record<string, any>,
    severity?: number
  ): string {
    const alert: Alert = {
      id: uuidv4(),
      type,
      message,
      source,
      timestamp: new Date(),
      metadata,
      severity
    };

    // Validate alert
    AlertSchema.parse(alert);

    // Add to alerts, respecting max alerts limit
    if (this.alerts.length >= this.config.maxAlerts) {
      this.alerts.shift(); // Remove oldest alert
    }
    this.alerts.push(alert);

    // Emit alert event
    this.eventEmitter.emit('alert', alert);

    // Update metrics
    this.updateAlertMetrics();
    this.alertSeverityMetric.set({ type }, severity ?? 5);

    this.loggingManager?.warn('Alert created', { 
      type, 
      message, 
      source,
      severity 
    });

    return alert.id;
  }

  public acknowledgeAlert(id: string, acknowledgedBy: string): void {
    const alert = this.alerts.find(a => a.id === id);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = new Date();

      this.updateAlertMetrics();
      this.loggingManager?.info('Alert acknowledged', { 
        id, 
        acknowledgedBy 
      });
    }
  }

  public getAlerts(filter?: AlertFilter): Alert[] {
    return this.alerts.filter(alert => {
      if (filter?.type && alert.type !== filter.type) return false;
      if (filter?.source && alert.source !== filter.source) return false;
      if (filter?.acknowledged !== undefined && alert.acknowledged !== filter.acknowledged) return false;
      if (filter?.from && alert.timestamp < filter.from) return false;
      if (filter?.to && alert.timestamp > filter.to) return false;
      return true;
    });
  }

  private updateHealthCheckMetrics(): void {
    const failingChecks = Array.from(this.healthChecks.values()).filter(check => !check.lastStatus);
    
    this.healthCheckMetric.set({ service: 'total' }, this.healthChecks.size);
    this.failingHealthCheckMetric.set({ service: 'total' }, failingChecks.length);
  }

  private updateAlertMetrics(): void {
    const unacknowledgedAlerts = this.alerts.filter(alert => !alert.acknowledged);
    
    this.alertMetric.set({ type: 'total', source: 'total' }, this.alerts.length);
    this.unacknowledgedAlertMetric.set({ type: 'total' }, unacknowledgedAlerts.length);
  }

  // Event emitter methods with type safety
  public on<K extends keyof MonitoringEvents>(
    event: K, 
    listener: MonitoringEvents[K]
  ): void {
    this.eventEmitter.on(event, listener);
  }

  public off<K extends keyof MonitoringEvents>(
    event: K, 
    listener: MonitoringEvents[K]
  ): void {
    this.eventEmitter.off(event, listener);
  }

  private setupHealthCheckMetrics() {
    return this.metricsManager?.createGauge({
      name: 'monitoring_health_checks_total',
      help: 'Total number of health checks',
      labelNames: ['service']
    });
  }

  private setupFailingHealthCheckMetrics() {
    return this.metricsManager?.createGauge({
      name: 'monitoring_health_checks_failing',
      help: 'Number of failing health checks',
      labelNames: ['service']
    });
  }

  private setupAlertMetrics() {
    return this.metricsManager?.createGauge({
      name: 'monitoring_alerts_total',
      help: 'Total number of alerts',
      labelNames: ['type', 'source']
    });
  }

  private setupUnacknowledgedAlertMetrics() {
    return this.metricsManager?.createGauge({
      name: 'monitoring_alerts_unacknowledged',
      help: 'Number of unacknowledged alerts',
      labelNames: ['type']
    });
  }

  private setupCheckDurationMetrics() {
    return this.metricsManager?.createHistogram({
      name: 'monitoring_check_duration_seconds',
      help: 'Duration of health checks',
      labelNames: ['service'],
      buckets: [0.1, 0.5, 1, 5, 10]
    });
  }

  private setupAlertSeverityMetrics() {
    return this.metricsManager?.createGauge({
      name: 'monitoring_alert_severity',
      help: 'Severity of alerts',
      labelNames: ['type']
    });
  }
}

// Type-safe event system
interface MonitoringEvents {
  alert: (alert: Alert) => void;
  healthCheckFailed: (check: HealthCheck) => void;
}

export default MonitoringManager.getInstance();
