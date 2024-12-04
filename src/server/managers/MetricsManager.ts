import { Counter, Gauge, Histogram, Registry, Summary } from 'prom-client';
import { BaseService, ServiceConfig } from '../services/base.service';
import { LoggingManager } from './LoggingManager';
import { ConfigManager } from './ConfigManager';
import { ServiceHealth } from '../../types/service';
import { BaseManagerDependencies } from './ManagerContainer';
import { metricsService, MetricName } from '../services/metrics.service';
import { metrics } from '../metrics';

const METRICS_SERVICE_CONFIG: ServiceConfig = {
  retryOptions: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 5000,
    factor: 2,
    timeout: 30000
  },
  cacheOptions: {
    ttl: 300,
    prefix: 'metrics:'
  },
  metricsEnabled: true,
  loggingEnabled: true,
  validation: {
    strict: true
  }
};

export class MetricsManager extends BaseService {
  private static instance: MetricsManager;
  private readonly registry: Registry;
  private readonly metricStore: Map<string, Counter<string> | Gauge<string> | Histogram<string> | Summary<string>>;
  private configManager?: ConfigManager;
  private loggingManager?: LoggingManager;

  protected override readonly metrics = {
    httpRequestDuration: metrics.httpRequestDuration,
    apiErrors: metrics.apiErrors,
    operationDuration: metrics.operationDuration,
    hostMetrics: metrics.hostMetrics,
    serviceMetrics: metrics.serviceMetrics,
    initialize: () => metrics.initialize(),
    cleanup: () => metrics.cleanup(),
    histogram: (name: string, value: number, labels: Record<string, string | number>) => 
      metrics.histogram(name, value, labels),
    increment: (name: string, value: number, labels: Record<string, string | number>) => 
      metrics.increment(name, value, labels),
    gauge: (name: string, value: number, labels?: Record<string, string | number>) => 
      metrics.gauge(name, value, labels),
    observeHttpDuration: (method: string, route: string, statusCode: string, duration: number) => 
      metrics.observeHttpDuration(method, route, statusCode, duration),
    incrementApiError: (method: string, route: string, errorType: string) => 
      metrics.incrementApiError(method, route, errorType)
  };

  private constructor() {
    super(METRICS_SERVICE_CONFIG);
    this.registry = new Registry();
    this.metricStore = new Map();
  }

  public static getInstance(): MetricsManager {
    if (!MetricsManager.instance) {
      MetricsManager.instance = new MetricsManager();
    }
    return MetricsManager.instance;
  }

  public initialize(deps: BaseManagerDependencies): void {
    if (!deps.configManager || !deps.loggingManager) {
      throw new Error('Required dependencies not provided');
    }

    this.configManager = deps.configManager;
    this.loggingManager = deps.loggingManager;
    this.metrics.initialize();
  }

  public getRegistry(): Registry {
    return this.registry;
  }

  public recordServiceMetric(
    name: MetricName, 
    value: number, 
    labels?: Record<string, string>
  ): void {
    try {
      // Record in Prometheus registry
      const counter = this.createCounter(name);
      counter.inc(value);

      // Record in metrics service
      metricsService.recordMetric(name, value, labels);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.loggingManager?.error('Failed to record service metric', { 
        error: errorMessage,
        metricName: name,
        metricValue: value
      });
    }
  }

  public createCounter(name: string): Counter<string>;
  public createCounter(name: string, help: string): Counter<string>;
  public createCounter(name: string, help: string, labelNames?: string[]): Counter<string>;
  public createCounter(name: string, help?: string, labelNames?: string[]): Counter<string> {
    const counter = new Counter({
      name,
      help: help || name,
      labelNames,
      registers: [this.registry]
    });
    this.metricStore.set(name, counter);
    return counter;
  }

  public createGauge(name: string): Gauge<string>;
  public createGauge(name: string, help: string): Gauge<string>;
  public createGauge(name: string, help: string, labelNames?: string[]): Gauge<string>;
  public createGauge(name: string, help?: string, labelNames?: string[]): Gauge<string> {
    const gauge = new Gauge({
      name,
      help: help || name,
      labelNames,
      registers: [this.registry]
    });
    this.metricStore.set(name, gauge);
    return gauge;
  }

  public createHistogram(name: string): Histogram<string>;
  public createHistogram(name: string, help: string): Histogram<string>;
  public createHistogram(name: string, help: string, labelNames?: string[]): Histogram<string>;
  public createHistogram(name: string, help: string, labelNames?: string[], buckets?: number[]): Histogram<string>;
  public createHistogram(name: string, help?: string, labelNames?: string[], buckets?: number[]): Histogram<string> {
    const histogram = new Histogram({
      name,
      help: help || name,
      labelNames,
      buckets,
      registers: [this.registry]
    });
    this.metricStore.set(name, histogram);
    return histogram;
  }

  public incrementCounter(name: string, labels?: Record<string, string>): void {
    const metric = this.metricStore.get(name);
    if (metric instanceof Counter) {
      if (labels) {
        metric.inc(labels);
      } else {
        metric.inc(1);
      }
    }
  }

  public incrementHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const metric = this.metricStore.get(name);
    if (metric instanceof Histogram) {
      if (labels) {
        metric.observe(labels, value);
      } else {
        metric.observe(value);
      }
    }
  }

  public setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const metric = this.metricStore.get(name);
    if (metric instanceof Gauge) {
      if (labels) {
        metric.set(labels, value);
      } else {
        metric.set(value);
      }
    }
  }

  public getHealth(): ServiceHealth {
    return {
      status: 'healthy',
      details: {
        metrics: {
          status: 'available',
          lastUpdate: new Date()
        },
        resources: {
          memory: process.memoryUsage().heapUsed,
          cpu: process.cpuUsage().system,
          connections: this.metricStore.size
        }
      },
      lastCheck: new Date()
    };
  }

  public async cleanup(): Promise<void> {
    await Promise.all([
      Promise.resolve(this.metrics.cleanup()),
      Promise.resolve(this.metricStore.clear()),
      Promise.resolve(this.registry.clear())
    ]);
  }
}
