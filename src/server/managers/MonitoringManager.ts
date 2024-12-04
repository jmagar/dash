import { z } from 'zod';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

import { BaseService } from './base/BaseService';
import { MetricsManager } from './MetricsManager';
import { LoggingManager } from './LoggingManager';
import { ConfigManager } from './ConfigManager';
import { ServiceHealth, ServiceStatus } from './base/types';

// Enhanced Zod schemas with more validation
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
});

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
});

// Dependency Injection Interface
export interface MonitoringManagerDependencies {
  configManager?: ConfigManager;
  metricsManager?: MetricsManager;
  loggingManager?: LoggingManager;
}

type HealthCheck = z.infer<typeof HealthCheckSchema>;
type Alert = z.infer<typeof AlertSchema>;

export class MonitoringManager extends BaseService {
  private static instance: MonitoringManager;
  
  // Core monitoring components
  private healthChecks: Map<string, HealthCheck>;
  private alerts: Alert[];
  private checkIntervals: Map<string, NodeJS.Timer>;
  private eventEmitter: EventEmitter;

  // Dependency managers with optional injection
  private configManager: ConfigManager;
  private metricsManager: MetricsManager;
  private loggingManager: LoggingManager;

  // Configuration parameters
  private alertRetentionDays: number;
  private maxAlerts: number;
  private globalHealthCheckTimeout: number;

  // Metrics trackers
  private healthCheckMetric: any;
  private failingHealthCheckMetric: any;
  private alertMetric: any;
  private unacknowledgedAlertMetric: any;
  private checkDurationMetric: any;
  private alertSeverityMetric: any;

  private constructor(private dependencies?: MonitoringManagerDependencies) {
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

    // Get dependency instances with optional injection
    this.configManager = dependencies?.configManager ?? ConfigManager.getInstance();
    this.metricsManager = dependencies?.metricsManager ?? MetricsManager.getInstance();
    this.loggingManager = dependencies?.loggingManager ?? LoggingManager.getInstance();

    // Load configuration with more robust defaults
    this.alertRetentionDays = this.configManager.get('monitoring.alertRetentionDays', 30);
    this.maxAlerts = this.configManager.get('monitoring.maxAlerts', 1000);
    this.globalHealthCheckTimeout = this.configManager.get('monitoring.healthCheckTimeout', 30000);

    // Setup metrics
    this.setupMetrics();
  }

  public static getInstance(dependencies?: MonitoringManagerDependencies): MonitoringManager {
    if (!MonitoringManager.instance) {
      MonitoringManager.instance = new MonitoringManager(dependencies);
    }
    return MonitoringManager.instance;
  }

  private setupMetrics(): void {
    const metrics = this.metricsManager;
    
    this.healthCheckMetric = metrics.createGauge({
      name: 'monitoring_health_checks_total',
      help: 'Total number of health checks',
      labelNames: ['service']
    });

    this.failingHealthCheckMetric = metrics.createGauge({
      name: 'monitoring_health_checks_failing',
      help: 'Number of failing health checks',
      labelNames: ['service']
    });

    this.alertMetric = metrics.createGauge({
      name: 'monitoring_alerts_total',
      help: 'Total number of alerts',
      labelNames: ['type', 'source']
    });

    this.unacknowledgedAlertMetric = metrics.createGauge({
      name: 'monitoring_alerts_unacknowledged',
      help: 'Number of unacknowledged alerts',
      labelNames: ['type']
    });

    this.checkDurationMetric = metrics.createHistogram({
      name: 'monitoring_check_duration_seconds',
      help: 'Duration of health checks',
      labelNames: ['service'],
      buckets: [0.1, 0.5, 1, 5, 10]
    });

    this.alertSeverityMetric = metrics.createGauge({
      name: 'monitoring_alert_severity',
      help: 'Severity of alerts',
      labelNames: ['type']
    });
  }

  public async init(): Promise<void> {
    try {
      // Load persisted alerts and health checks
      await this.loadPersistedData();

      // Start all registered health checks
      for (const check of this.healthChecks.values()) {
        await this.startHealthCheck(check);
      }

      this.loggingManager.info('MonitoringManager initialized successfully', {
        healthChecks: this.healthChecks.size,
        alerts: this.alerts.length
      });
    } catch (error) {
      this.loggingManager.error('Failed to initialize MonitoringManager', { 
        error,
        stack: error instanceof Error ? error.stack : undefined 
      });
      throw error;
    }
  }

  public registerHealthCheck(
    name: string,
    check: () => Promise<boolean>,
    interval: number = 60000,
    timeout: number = this.globalHealthCheckTimeout,
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

    this.loggingManager.info('Health check registered', { 
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
        this.loggingManager.error('Health check failed', { 
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
    type: 'error' | 'warning' | 'info',
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
    if (this.alerts.length >= this.maxAlerts) {
      this.alerts.shift(); // Remove oldest alert
    }
    this.alerts.push(alert);

    // Emit alert event
    this.eventEmitter.emit('alert', alert);

    // Update metrics
    this.updateAlertMetrics();
    this.alertSeverityMetric.set({ type }, severity ?? 5);

    this.loggingManager.warn('Alert created', { 
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
      this.loggingManager.info('Alert acknowledged', { 
        id, 
        acknowledgedBy 
      });
    }
  }

  public getAlerts(filter?: {
    type?: 'error' | 'warning' | 'info';
    source?: string;
    acknowledged?: boolean;
    from?: Date;
    to?: Date;
  }): Alert[] {
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

  // Event emitter methods
  public on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  public off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }
}

export default MonitoringManager.getInstance();
