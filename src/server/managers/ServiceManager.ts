// Node.js built-in modules
import { EventEmitter } from 'events';

// External libraries
import { z } from 'zod';
import { Injectable } from '@nestjs/common';

// Local imports
import { BaseService } from '../services/base.service';
import { ServiceHealth, ServiceStatus } from '../types/service.types';
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
}).strict();

const ServiceStatusSchema = z.object({
  name: z.string(),
  status: z.enum(['starting', 'running', 'stopping', 'stopped', 'failed']),
  health: z.enum(['healthy', 'unhealthy', 'degraded']),
  lastChecked: z.number(),
  error: z.string().optional(),
  dependencies: z.record(z.string(), z.boolean())
}).strict();

// Dependency Injection Interface
export interface ServiceManagerDependencies {
  configManager?: ConfigManager;
  loggingManager?: LoggingManager;
  metricsManager?: MetricsManager;
  stateManager?: StateManager;
}

@Injectable()
export class ServiceManager extends BaseService {
  private static instance: ServiceManager;
  
  // Dependency Managers
  private configManager: ConfigManager;
  private loggingManager: LoggingManager;
  private metricsManager: MetricsManager;
  private stateManager: StateManager;

  // Service management components
  private services: Map<string, BaseService>;
  private serviceConfigs: Map<string, z.infer<typeof ServiceConfigSchema>>;
  private serviceStatuses: Map<string, z.infer<typeof ServiceStatusSchema>>;
  private startupOrder: string[];
  private eventEmitter: EventEmitter;
  private healthCheckIntervals: Map<string, NodeJS.Timeout>;

  // Metrics trackers
  private totalServicesMetric: any;
  private runningServicesMetric: any;
  private failedServicesMetric: any;
  private serviceStartupDurationMetric: any;

  private constructor(private dependencies?: ServiceManagerDependencies) {
    super({
      name: 'ServiceManager',
      version: '1.0.0',
      dependencies: [
        'ConfigManager', 
        'LoggingManager', 
        'MetricsManager', 
        'StateManager'
      ]
    });
  }

  public static getInstance(dependencies?: ServiceManagerDependencies): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager(dependencies);
    }
    return ServiceManager.instance;
  }

  private setupMetrics(): void {
    const metrics = this.metricsManager;

    this.totalServicesMetric = metrics.createGauge(
      'service_manager_total_services', 
      'Total number of services'
    );

    this.runningServicesMetric = metrics.createGauge(
      'service_manager_running_services', 
      'Number of running services'
    );

    this.failedServicesMetric = metrics.createGauge(
      'service_manager_failed_services', 
      'Number of failed services'
    );

    this.serviceStartupDurationMetric = metrics.createHistogram(
      'service_manager_startup_duration_seconds', 
      'Duration of service startup', 
      ['service'], 
      [0.1, 0.5, 1, 5, 10]
    );
  }

  public async init(): Promise<void> {
    try {
      // Dependency Injection with Fallback
      this.configManager = this.dependencies?.configManager ?? ConfigManager.getInstance();
      this.loggingManager = this.dependencies?.loggingManager ?? LoggingManager.getInstance();
      this.metricsManager = this.dependencies?.metricsManager ?? MetricsManager.getInstance();
      this.stateManager = this.dependencies?.stateManager ?? StateManager.getInstance();

      // Initialize components
      this.services = new Map();
      this.serviceConfigs = new Map();
      this.serviceStatuses = new Map();
      this.startupOrder = [];
      this.eventEmitter = new EventEmitter();
      this.healthCheckIntervals = new Map();

      // Initialize Metrics
      this.setupMetrics();

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

  public async getHealth(): Promise<ServiceHealth> {
    try {
      const runningServices = Array.from(this.serviceStatuses.values())
        .filter(status => status.status === 'running');

      const status = runningServices.every(s => s.health === 'healthy')
        ? ServiceStatus.HEALTHY
        : runningServices.some(s => s.health === 'degraded')
          ? ServiceStatus.DEGRADED
          : ServiceStatus.UNHEALTHY;

      return {
        status,
        version: this.version,
        details: {
          totalServices: this.services.size,
          runningServices: runningServices.length,
          serviceStatuses: Object.fromEntries(
            Array.from(this.serviceStatuses.entries()).map(([name, status]) => [name, status.health])
          )
        }
      };
    } catch (error) {
      this.loggingManager.error('ServiceManager health check failed', { error });
      return {
        status: ServiceStatus.UNHEALTHY,
        version: this.version,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  public async cleanup(): Promise<void> {
    try {
      // Stop all services
      for (const [name, service] of this.services.entries()) {
        try {
          await service.cleanup();
        } catch (error) {
          this.loggingManager.error(`Error cleaning up service ${name}`, { error });
        }
      }

      // Clear intervals and reset state
      this.healthCheckIntervals.forEach(clearInterval);
      this.healthCheckIntervals.clear();
      this.services.clear();
      this.serviceStatuses.clear();

      this.loggingManager.info('ServiceManager cleaned up successfully');
    } catch (error) {
      this.loggingManager.error('Error during ServiceManager cleanup', { error });
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

        // TODO: Implement actual service startup logic
        this.loggingManager.info(`Starting service: ${serviceName}`);

        const startupDuration = Date.now() - startTime;
        this.serviceStartupDurationMetric.observe(
          { service: serviceName }, 
          startupDuration / 1000
        );
      } catch (error) {
        this.loggingManager.error(`Failed to start service ${serviceName}`, { error });
        // Handle service startup failure
      }
    }
  }
}

export default ServiceManager.getInstance();
