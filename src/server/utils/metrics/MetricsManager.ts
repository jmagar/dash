import { Registry, Counter, Gauge, Histogram } from 'prom-client';
import { logger } from '../logger';
import { LoggingManager } from '../../../../../../../../../../utils/logging/LoggingManager';

export interface MetricLabels {
  [key: string]: string | number;
}

export interface MetricOptions {
  name: string;
  help: string;
  labelNames?: string[];
}

export class MetricsManager {
  private static instance: MetricsManager;
  private registry: Registry;
  private metrics: Map<string, Counter | Gauge | Histogram>;

  private constructor() {
    this.registry = new Registry();
    this.metrics = new Map();

    // Add default metrics
    this.registry.setDefaultLabels({
      app: 'dash',
      env: process.env.NODE_ENV || 'development'
    });
  }

  public static getInstance(): MetricsManager {
    if (!MetricsManager.instance) {
      MetricsManager.instance = new MetricsManager();
    }
    return MetricsManager.instance;
  }

  /**
   * Create or get a counter metric
   */
  public counter(options: MetricOptions): Counter<string> {
    const existing = this.metrics.get(options.name);
    if (existing) {
      if (!(existing instanceof Counter)) {
        throw new Error(`Metric ${options.name} exists but is not a Counter`);
      }
      return existing;
    }

    const counter = new Counter({
      name: options.name,
      help: options.help,
      labelNames: options.labelNames,
      registers: [this.registry]
    });

    this.metrics.set(options.name, counter);
    return counter;
  }

  /**
   * Create or get a gauge metric
   */
  public gauge(options: MetricOptions): Gauge<string> {
    const existing = this.metrics.get(options.name);
    if (existing) {
      if (!(existing instanceof Gauge)) {
        throw new Error(`Metric ${options.name} exists but is not a Gauge`);
      }
      return existing;
    }

    const gauge = new Gauge({
      name: options.name,
      help: options.help,
      labelNames: options.labelNames,
      registers: [this.registry]
    });

    this.metrics.set(options.name, gauge);
    return gauge;
  }

  /**
   * Create or get a histogram metric
   */
  public histogram(options: MetricOptions & { buckets?: number[] }): Histogram<string> {
    const existing = this.metrics.get(options.name);
    if (existing) {
      if (!(existing instanceof Histogram)) {
        throw new Error(`Metric ${options.name} exists but is not a Histogram`);
      }
      return existing;
    }

    const histogram = new Histogram({
      name: options.name,
      help: options.help,
      labelNames: options.labelNames,
      buckets: options.buckets,
      registers: [this.registry]
    });

    this.metrics.set(options.name, histogram);
    return histogram;
  }

  /**
   * Increment a counter with labels
   */
  public increment(name: string, labels?: MetricLabels, value = 1): void {
    try {
      const metric = this.metrics.get(name);
      if (!metric || !(metric instanceof Counter)) {
        throw new Error(`Counter metric ${name} not found`);
      }
      metric.inc(labels, value);
    } catch (error) {
      loggerLoggingManager.getInstance().();
    }
  }

  /**
   * Set a gauge value with labels
   */
  public set(name: string, labels: MetricLabels, value: number): void {
    try {
      const metric = this.metrics.get(name);
      if (!metric || !(metric instanceof Gauge)) {
        throw new Error(`Gauge metric ${name} not found`);
      }
      metric.set(labels, value);
    } catch (error) {
      loggerLoggingManager.getInstance().();
    }
  }

  /**
   * Observe a histogram value with labels
   */
  public observe(name: string, labels: MetricLabels, value: number): void {
    try {
      const metric = this.metrics.get(name);
      if (!metric || !(metric instanceof Histogram)) {
        throw new Error(`Histogram metric ${name} not found`);
      }
      metric.observe(labels, value);
    } catch (error) {
      loggerLoggingManager.getInstance().();
    }
  }

  /**
   * Get all metrics in Prometheus format
   */
  public async metrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Clear all metrics
   */
  public clear(): void {
    this.registry.clear();
    this.metrics.clear();
  }

  /**
   * Start collecting default metrics
   */
  public startDefaultMetrics(interval = 10000): void {
    const { collectDefaultMetrics } = require('prom-client');
    collectDefaultMetrics({
      register: this.registry,
      prefix: 'dash_',
      interval
    });
  }
}

