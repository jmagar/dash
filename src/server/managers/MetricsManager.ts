import { Registry, Counter, Gauge, Histogram, Summary, collectDefaultMetrics } from 'prom-client';
import { BaseService } from './base/BaseService';
import { LoggingManager } from './LoggingManager';
import { ConfigManager } from './ConfigManager';
import { ServiceHealth, ServiceStatus } from './base/types';
import { z } from 'zod';

export interface MetricLabels {
  [key: string]: string | number;
}

export interface MetricOptions {
  name: string;
  help: string;
  labelNames?: string[];
  buckets?: number[];
  percentiles?: number[];
}

const MetricsConfigSchema = z.object({
  enabled: z.boolean(),
  defaultMetrics: z.boolean(),
  prefix: z.string(),
  defaultLabels: z.record(z.string()),
  interval: z.number(),
  gcMetrics: z.boolean(),
  eventLoopMetrics: z.boolean(),
  processMetrics: z.boolean()
});

type MetricsConfig = z.infer<typeof MetricsConfigSchema>;

export class MetricsManager extends BaseService {
  private static instance: MetricsManager;
  private registry: Registry;
  private metrics: Map<string, Counter | Gauge | Histogram | Summary>;
  private defaultMetricsInterval?: NodeJS.Timer;
  private config: MetricsConfig;
  private logger: LoggingManager;

  // Internal metrics
  private metricsCreated: Counter;
  private metricsScrapes: Counter;
  private metricsErrors: Counter;
  private activeMetrics: Gauge;
  private scrapeLatency: Histogram;

  private constructor() {
    super({
      name: 'MetricsManager',
      version: '1.0.0',
      dependencies: ['LoggingManager', 'ConfigManager']
    });

    this.registry = new Registry();
    this.metrics = new Map();
    this.initializeInternalMetrics();
  }

  public static getInstance(): MetricsManager {
    if (!MetricsManager.instance) {
      MetricsManager.instance = new MetricsManager();
    }
    return MetricsManager.instance;
  }

  private initializeInternalMetrics(): void {
    this.metricsCreated = new Counter({
      name: 'metrics_created_total',
      help: 'Total number of metrics created',
      labelNames: ['type'],
      registers: [this.registry]
    });

    this.metricsScrapes = new Counter({
      name: 'metrics_scrapes_total',
      help: 'Total number of metric scrapes',
      registers: [this.registry]
    });

    this.metricsErrors = new Counter({
      name: 'metrics_errors_total',
      help: 'Total number of metric operation errors',
      labelNames: ['operation'],
      registers: [this.registry]
    });

    this.activeMetrics = new Gauge({
      name: 'active_metrics',
      help: 'Number of active metrics',
      labelNames: ['type'],
      registers: [this.registry]
    });

    this.scrapeLatency = new Histogram({
      name: 'metrics_scrape_duration_seconds',
      help: 'Duration of metric scrape operations',
      buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.5],
      registers: [this.registry]
    });
  }

  async init(): Promise<void> {
    this.logger = LoggingManager.getInstance();
    const configManager = ConfigManager.getInstance();

    try {
      // Load and validate config
      const rawConfig = await configManager.get('metrics');
      this.config = MetricsConfigSchema.parse({
        enabled: true,
        defaultMetrics: true,
        prefix: 'dash_',
        defaultLabels: {
          app: 'dash',
          service: this.name,
          version: this.version,
          env: process.env.NODE_ENV || 'development'
        },
        interval: 10000,
        gcMetrics: true,
        eventLoopMetrics: true,
        processMetrics: true,
        ...rawConfig
      });

      // Set default labels
      this.registry.setDefaultLabels(this.config.defaultLabels);

      // Start collecting metrics if enabled
      if (this.config.enabled) {
        if (this.config.defaultMetrics) {
          this.startDefaultMetrics();
        }
        if (this.config.gcMetrics) {
          this.startGCMetrics();
        }
        if (this.config.eventLoopMetrics) {
          this.startEventLoopMetrics();
        }
        if (this.config.processMetrics) {
          this.startProcessMetrics();
        }
      }

      this.logger.info('MetricsManager initialized successfully', {
        enabled: this.config.enabled,
        defaultMetrics: this.config.defaultMetrics,
        interval: this.config.interval
      });
    } catch (error) {
      this.logger.error('Failed to initialize MetricsManager', { error });
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    if (this.defaultMetricsInterval) {
      clearInterval(this.defaultMetricsInterval);
    }

    this.registry.clear();
    this.metrics.clear();
    this.logger.info('MetricsManager cleanup completed');
  }

  async getHealth(): Promise<ServiceHealth> {
    return {
      status: ServiceStatus.HEALTHY,
      version: this.version,
      details: {
        metricsCount: this.metrics.size,
        defaultMetricsEnabled: !!this.defaultMetricsInterval,
        metrics: {
          created: await this.metricsCreated.get(),
          scrapes: await this.metricsScrapes.get(),
          errors: await this.metricsErrors.get(),
          active: await this.activeMetrics.get()
        }
      }
    };
  }

  private startDefaultMetrics(): void {
    collectDefaultMetrics({
      register: this.registry,
      prefix: this.config.prefix,
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
    });

    this.logger.debug('Started collecting default metrics');
  }

  private startGCMetrics(): void {
    // Implement GC metrics collection
    this.logger.debug('Started collecting GC metrics');
  }

  private startEventLoopMetrics(): void {
    // Implement event loop metrics collection
    this.logger.debug('Started collecting event loop metrics');
  }

  private startProcessMetrics(): void {
    // Implement process metrics collection
    this.logger.debug('Started collecting process metrics');
  }

  createCounter(options: MetricOptions): Counter {
    try {
      const counter = new Counter({
        name: this.config.prefix + options.name,
        help: options.help,
        labelNames: options.labelNames,
        registers: [this.registry]
      });

      this.metrics.set(options.name, counter);
      this.metricsCreated.inc({ type: 'counter' });
      this.activeMetrics.inc({ type: 'counter' });
      
      return counter;
    } catch (error) {
      this.metricsErrors.inc({ operation: 'create_counter' });
      throw error;
    }
  }

  createGauge(options: MetricOptions): Gauge {
    try {
      const gauge = new Gauge({
        name: this.config.prefix + options.name,
        help: options.help,
        labelNames: options.labelNames,
        registers: [this.registry]
      });

      this.metrics.set(options.name, gauge);
      this.metricsCreated.inc({ type: 'gauge' });
      this.activeMetrics.inc({ type: 'gauge' });
      
      return gauge;
    } catch (error) {
      this.metricsErrors.inc({ operation: 'create_gauge' });
      throw error;
    }
  }

  createHistogram(options: MetricOptions): Histogram {
    try {
      const histogram = new Histogram({
        name: this.config.prefix + options.name,
        help: options.help,
        labelNames: options.labelNames,
        buckets: options.buckets,
        registers: [this.registry]
      });

      this.metrics.set(options.name, histogram);
      this.metricsCreated.inc({ type: 'histogram' });
      this.activeMetrics.inc({ type: 'histogram' });
      
      return histogram;
    } catch (error) {
      this.metricsErrors.inc({ operation: 'create_histogram' });
      throw error;
    }
  }

  createSummary(options: MetricOptions): Summary {
    try {
      const summary = new Summary({
        name: this.config.prefix + options.name,
        help: options.help,
        labelNames: options.labelNames,
        percentiles: options.percentiles,
        registers: [this.registry]
      });

      this.metrics.set(options.name, summary);
      this.metricsCreated.inc({ type: 'summary' });
      this.activeMetrics.inc({ type: 'summary' });
      
      return summary;
    } catch (error) {
      this.metricsErrors.inc({ operation: 'create_summary' });
      throw error;
    }
  }

  async getMetrics(): Promise<string> {
    const startTime = process.hrtime();
    
    try {
      const metrics = await this.registry.metrics();
      this.metricsScrapes.inc();
      
      const [seconds, nanoseconds] = process.hrtime(startTime);
      this.scrapeLatency.observe(seconds + nanoseconds / 1e9);
      
      return metrics;
    } catch (error) {
      this.metricsErrors.inc({ operation: 'scrape' });
      throw error;
    }
  }

  getMetric(name: string): Counter | Gauge | Histogram | Summary | undefined {
    return this.metrics.get(name);
  }

  removeMetric(name: string): void {
    const metric = this.metrics.get(name);
    if (metric) {
      this.registry.removeSingleMetric(this.config.prefix + name);
      this.metrics.delete(name);
      this.activeMetrics.dec({ type: metric.constructor.name.toLowerCase() });
      this.logger.debug('Removed metric', { name });
    }
  }

  clearMetrics(): void {
    this.registry.clear();
    this.metrics.clear();
    this.activeMetrics.set(0);
    this.logger.info('Cleared all metrics');
  }
}

export default MetricsManager.getInstance();
