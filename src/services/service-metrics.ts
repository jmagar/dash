import { Injectable } from '@nestjs/common';
import { BaseService } from './base-service';
import { ServiceStatus } from '../types/status';
import { EventEmitter } from 'events';
import { ServiceConfig } from '../types/service-config';

export interface ServiceMetric {
  timestamp: Date;
  name: string;
  value: number;
  labels?: Record<string, string>;
}

export interface ServiceMetrics {
  cpu: number;
  memory: number;
  latency: number;
  errorRate: number;
  uptime: number;
  requestCount: number;
  activeConnections: number;
  lastError?: Error;
  customMetrics: Record<string, number>;
}

interface MetricsEvents {
  'metrics:update': (metrics: ServiceMetrics) => void;
  'metrics:threshold': (metric: ServiceMetric) => void;
}

@Injectable()
export class ServiceMetricsCollector extends BaseService {
  private readonly metricsEmitter: EventEmitter;
  private readonly metrics: Map<string, ServiceMetrics>;
  private readonly thresholds: Map<string, number>;
  private collectionInterval?: NodeJS.Timeout;

  constructor(config: ServiceConfig) {
    super({
      name: 'service-metrics',
      version: '1.0.0',
      ...config
    });

    this.metricsEmitter = new EventEmitter();
    this.metrics = new Map();
    this.thresholds = new Map();

    // Set default thresholds
    if (config.health?.thresholds) {
      const { thresholds } = config.health;
      if (thresholds.cpu) this.thresholds.set('cpu', thresholds.cpu);
      if (thresholds.memory) this.thresholds.set('memory', thresholds.memory);
      if (thresholds.latency) this.thresholds.set('latency', thresholds.latency);
      if (thresholds.errorRate) this.thresholds.set('errorRate', thresholds.errorRate);
    }
  }

  /**
   * Record a metric value
   */
  public recordMetric(serviceName: string, name: string, value: number, labels?: Record<string, string>) {
    const metric: ServiceMetric = {
      timestamp: new Date(),
      name,
      value,
      labels
    };

    // Update metrics
    let serviceMetrics = this.metrics.get(serviceName);
    if (!serviceMetrics) {
      serviceMetrics = this.createEmptyMetrics();
      this.metrics.set(serviceName, serviceMetrics);
    }

    // Update specific metric
    switch (name) {
      case 'cpu':
        serviceMetrics.cpu = value;
        break;
      case 'memory':
        serviceMetrics.memory = value;
        break;
      case 'latency':
        serviceMetrics.latency = value;
        break;
      case 'errorRate':
        serviceMetrics.errorRate = value;
        break;
      case 'requestCount':
        serviceMetrics.requestCount = value;
        break;
      case 'activeConnections':
        serviceMetrics.activeConnections = value;
        break;
      default:
        serviceMetrics.customMetrics[name] = value;
    }

    // Check thresholds
    const threshold = this.thresholds.get(name);
    if (threshold !== undefined && value > threshold) {
      this.metricsEmitter.emit('metrics:threshold', metric);
    }

    // Emit metrics update
    this.metricsEmitter.emit('metrics:update', serviceMetrics);
  }

  /**
   * Record an error
   */
  public recordError(serviceName: string, error: Error) {
    const serviceMetrics = this.metrics.get(serviceName) || this.createEmptyMetrics();
    serviceMetrics.lastError = error;
    serviceMetrics.errorRate = (serviceMetrics.errorRate * 0.9) + 0.1; // Simple moving average
    this.metrics.set(serviceName, serviceMetrics);
  }

  /**
   * Get metrics for a service
   */
  public getMetrics(serviceName: string): ServiceMetrics | undefined {
    return this.metrics.get(serviceName);
  }

  /**
   * Get all service metrics
   */
  public getAllMetrics(): Map<string, ServiceMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Subscribe to metrics events
   */
  public on<K extends keyof MetricsEvents>(
    event: K,
    listener: MetricsEvents[K]
  ): this {
    this.metricsEmitter.on(event, listener);
    return this;
  }

  /**
   * Set a threshold for a metric
   */
  public setThreshold(metricName: string, value: number) {
    this.thresholds.set(metricName, value);
  }

  /**
   * Create empty metrics object
   */
  private createEmptyMetrics(): ServiceMetrics {
    return {
      cpu: 0,
      memory: 0,
      latency: 0,
      errorRate: 0,
      uptime: 0,
      requestCount: 0,
      activeConnections: 0,
      customMetrics: {}
    };
  }

  protected async onStart(): Promise<void> {
    // Start collecting system metrics
    this.collectionInterval = setInterval(() => {
      // Example: collect system metrics
      const metrics = process.memoryUsage();
      this.recordMetric('system', 'memory', metrics.heapUsed / metrics.heapTotal);
      
      // Example: collect CPU usage (simplified)
      const cpuUsage = process.cpuUsage();
      this.recordMetric('system', 'cpu', (cpuUsage.user + cpuUsage.system) / 1000000);
    }, this.config.health?.interval || 60000);
  }

  protected async onStop(): Promise<void> {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = undefined;
    }
    this.metrics.clear();
    this.metricsEmitter.removeAllListeners();
  }
}
