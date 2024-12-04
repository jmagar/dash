import { z } from 'zod';
import { EventEmitter } from 'events';
import { Injectable } from '@nestjs/common';

import { BaseService } from './base/BaseService';
import { ServiceHealth, ServiceStatus as ServiceHealthStatus } from './base/types';
import { ConfigManager } from './ConfigManager';
import { LoggingManager } from './LoggingManager';
import { MetricsManager } from './MetricsManager';
import { StateManager } from './StateManager';

// Zod schemas for type validation
const ServiceConfigSchema = z.object({
  name: z.string(),
  version: z.string(),
  dependencies: z.array(z.string()).optional(),
  startupTimeout: z.number().positive().optional().default(30000),
  shutdownTimeout: z.number().positive().optional().default(30000),
  healthCheckInterval: z.number().positive().optional().default(60000),
  retryAttempts: z.number().positive().optional().default(3),
  retryDelay: z.number().positive().optional().default(1000)
});

const ServiceStatusSchema = z.object({
  name: z.string(),
  status: z.enum(['starting', 'running', 'stopping', 'stopped', 'failed']),
  health: z.enum(['healthy', 'unhealthy', 'degraded']),
  lastChecked: z.number(),
  error: z.string().optional(),
  dependencies: z.record(z.string(), z.boolean())
});

type ServiceConfig = z.infer<typeof ServiceConfigSchema>;
type ServiceStatus = z.infer<typeof ServiceStatusSchema>;

@Injectable()
export class ServiceManager extends BaseService {
  private static instance: ServiceManager;
  
  // Service management components
  private services: Map<string, BaseService>;
  private serviceConfigs: Map<string, ServiceConfig>;
  private serviceStatuses: Map<string, ServiceStatus>;
  private startupOrder: string[];
  private eventEmitter: EventEmitter;
  private healthCheckIntervals: Map<string, NodeJS.Timer>;

  // Dependency managers
  private configManager: ConfigManager;
  private loggingManager: LoggingManager;
  private metricsManager: MetricsManager;
  private stateManager: StateManager;

  // Metrics trackers
  private totalServicesMetric: any;
  private runningServicesMetric: any;
  private failedServicesMetric: any;
  private serviceStartupDurationMetric: any;

  private constructor() {
    super({
      name: 'ServiceManager',
      version: '1.0.0',
      dependencies: ['ConfigManager', 'LoggingManager', 'MetricsManager', 'StateManager']
    });

    // Initialize service management components
    this.services = new Map();
    this.serviceConfigs = new Map();
    this.serviceStatuses = new Map();
    this.startupOrder = [];
    this.eventEmitter = new EventEmitter();
    this.healthCheckIntervals = new Map();

    // Get dependency instances
    this.configManager = ConfigManager.getInstance();
    this.loggingManager = LoggingManager.getInstance();
    this.metricsManager = MetricsManager.getInstance();
    this.stateManager = StateManager.getInstance();

    // Setup metrics
    this.setupMetrics();
  }

  public static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }

  private setupMetrics(): void {
    const metrics = this.metricsManager;

    this.totalServicesMetric = metrics.createGauge({
      name: 'service_manager_total_services',
      help: 'Total number of services'
    });

    this.runningServicesMetric = metrics.createGauge({
      name: 'service_manager_running_services',
      help: 'Number of running services'
    });

    this.failedServicesMetric = metrics.createGauge({
      name: 'service_manager_failed_services',
      help: 'Number of failed services'
    });

    this.serviceStartupDurationMetric = metrics.createHistogram({
      name: 'service_manager_startup_duration_seconds',
      help: 'Duration of service startup',
      buckets: [0.1, 0.5, 1, 5, 10]
    });
  }

  public async init(): Promise<void> {
    try {
      // Load service configurations
      await this.loadServiceConfigurations();

      // Determine startup order based on dependencies
      this.determineStartupOrder();

      // Start services in order
      await this.startServicesInOrder();

      this.loggingManager.info('ServiceManager initialized successfully', {
        totalServices: this.services.size,
        startupOrder: this.startupOrder
      });
    } catch (error) {
      this.loggingManager.error('Failed to initialize ServiceManager', { error });
      throw error;
    }
  }

  private async loadServiceConfigurations(): Promise<void> {
    try {
      const serviceConfigs = await this.configManager.get('services', []);
      
      for (const config of serviceConfigs) {
        const validatedConfig = ServiceConfigSchema.parse(config);
        this.serviceConfigs.set(validatedConfig.name, validatedConfig);
      }
    } catch (error) {
      this.loggingManager.warn('Could not load service configurations', { error });
    }
  }

  private determineStartupOrder(): void {
    const graph = new Map<string, Set<string>>();
    
    // Build dependency graph
    for (const [serviceName, config] of this.serviceConfigs) {
      if (!graph.has(serviceName)) {
        graph.set(serviceName, new Set());
      }
      
      config.dependencies?.forEach(dep => {
        if (!graph.has(dep)) {
          graph.set(dep, new Set());
        }
        graph.get(dep)!.add(serviceName);
      });
    }

    // Topological sort
    const visited = new Set<string>();
    const order: string[] = [];

    const visit = (node: string) => {
      if (visited.has(node)) return;
      visited.add(node);
      
      graph.get(node)?.forEach(visit);
      order.push(node);
    };

    for (const node of graph.keys()) {
      visit(node);
    }

    this.startupOrder = order.reverse();
  }

  private async startServicesInOrder(): Promise<void> {
    for (const serviceName of this.startupOrder) {
      const config = this.serviceConfigs.get(serviceName);
      if (!config) continue;

      try {
        const startTime = Date.now();
        
        // Check and start dependencies first
        if (config.dependencies) {
          for (const dep of config.dependencies) {
            const depStatus = this.serviceStatuses.get(dep);
            if (!depStatus || depStatus.status !== 'running') {
              throw new Error(`Dependency ${dep} is not running`);
            }
          }
        }

        // Start service
        const service = await this.startService(serviceName);

        // Track startup duration
        const duration = (Date.now() - startTime) / 1000;
        this.serviceStartupDurationMetric.observe(duration);

        this.loggingManager.info(`Service ${serviceName} started successfully`, { 
          duration,
          dependencies: config.dependencies 
        });
      } catch (error) {
        this.loggingManager.error(`Failed to start service ${serviceName}`, { error });
        
        // Update service status
        this.updateServiceStatus(serviceName, {
          status: 'failed',
          health: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Update metrics after startup
    this.updateServiceMetrics();
  }

  private async startService(serviceName: string): Promise<BaseService> {
    const config = this.serviceConfigs.get(serviceName);
    if (!config) {
      throw new Error(`No configuration found for service: ${serviceName}`);
    }

    // Placeholder for service instantiation logic
    // In a real implementation, you'd use a service factory or dependency injection
    const service = this.createService(serviceName);
    
    await service.init();

    this.services.set(serviceName, service);
    this.updateServiceStatus(serviceName, {
      status: 'running',
      health: 'healthy'
    });

    // Setup periodic health checks if configured
    if (config.healthCheckInterval) {
      this.setupHealthCheck(serviceName, config.healthCheckInterval);
    }

    return service;
  }

  private createService(serviceName: string): BaseService {
    // Placeholder method - replace with actual service creation logic
    throw new Error(`Service creation not implemented for: ${serviceName}`);
  }

  private setupHealthCheck(serviceName: string, interval: number): void {
    const healthCheck = async () => {
      try {
        const service = this.services.get(serviceName);
        if (!service) {
          throw new Error(`Service not found: ${serviceName}`);
        }

        const health = await service.getHealth();
        
        this.updateServiceStatus(serviceName, {
          status: 'running',
          health: health.status
        });
      } catch (error) {
        this.loggingManager.error(`Health check failed for ${serviceName}`, { error });
        
        this.updateServiceStatus(serviceName, {
          status: 'failed',
          health: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };

    // Run initial health check
    healthCheck();

    // Schedule periodic health checks
    const intervalId = setInterval(healthCheck, interval);
    this.healthCheckIntervals.set(serviceName, intervalId);
  }

  private updateServiceStatus(serviceName: string, status: Partial<ServiceStatus>): void {
    const currentStatus = this.serviceStatuses.get(serviceName) || {
      name: serviceName,
      status: 'stopped',
      health: 'unhealthy',
      lastChecked: Date.now(),
      dependencies: {}
    };

    const updatedStatus: ServiceStatus = {
      ...currentStatus,
      ...status,
      lastChecked: Date.now()
    };

    this.serviceStatuses.set(serviceName, updatedStatus);
    this.updateServiceMetrics();

    // Emit status change event
    this.eventEmitter.emit('serviceStatusChange', updatedStatus);
  }

  private updateServiceMetrics(): void {
    const runningServices = Array.from(this.serviceStatuses.values())
      .filter(status => status.status === 'running');
    
    const failedServices = Array.from(this.serviceStatuses.values())
      .filter(status => status.status === 'failed');

    this.totalServicesMetric.set(this.serviceStatuses.size);
    this.runningServicesMetric.set(runningServices.length);
    this.failedServicesMetric.set(failedServices.length);
  }

  public async getHealth(): Promise<ServiceHealth> {
    const runningServices = Array.from(this.serviceStatuses.values())
      .filter(status => status.status === 'running');
    
    const failedServices = Array.from(this.serviceStatuses.values())
      .filter(status => status.status === 'failed');

    return {
      status: failedServices.length > 0 
        ? ServiceHealthStatus.DEGRADED 
        : ServiceHealthStatus.HEALTHY,
      version: this.version,
      details: {
        totalServices: this.serviceStatuses.size,
        runningServices: runningServices.length,
        failedServices: failedServices.length,
        serviceStatuses: Object.fromEntries(this.serviceStatuses)
      }
    };
  }

  public async cleanup(): Promise<void> {
    try {
      // Stop health check intervals
      for (const interval of this.healthCheckIntervals.values()) {
        clearInterval(interval);
      }
      this.healthCheckIntervals.clear();

      // Shutdown services in reverse startup order
      for (const serviceName of this.startupOrder.slice().reverse()) {
        try {
          const service = this.services.get(serviceName);
          if (service) {
            await service.cleanup();
            this.updateServiceStatus(serviceName, {
              status: 'stopped',
              health: 'unhealthy'
            });
          }
        } catch (error) {
          this.loggingManager.error(`Error cleaning up service ${serviceName}`, { error });
        }
      }

      this.loggingManager.info('ServiceManager cleaned up successfully');
    } catch (error) {
      this.loggingManager.error('Error during ServiceManager cleanup', { error });
      throw error;
    }
  }

  // Event emitter methods
  public on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  public off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }
}

export default ServiceManager.getInstance();
