import { Injectable } from '@nestjs/common';
import { BaseService, ServiceConfig } from './base.service';
import { ServiceStatus } from '../types/status';
import { HealthMonitorService } from './health-monitor';
import { EventEmitter } from 'events';

interface ServiceRegistryEvents {
  'service:registered': (name: string) => void;
  'service:unregistered': (name: string) => void;
  'service:started': (name: string) => void;
  'service:stopped': (name: string) => void;
  'service:error': (name: string, error: Error) => void;
}

export interface ServiceMetadata {
  name: string;
  version: string;
  status: ServiceStatus;
  dependencies: string[];
  startTime?: Date;
  stopTime?: Date;
  error?: Error;
}

@Injectable()
export class ServiceRegistry extends BaseService {
  private readonly services: Map<string, BaseService>;
  private readonly metadata: Map<string, ServiceMetadata>;
  private readonly registryEmitter: EventEmitter;
  private readonly healthMonitor: HealthMonitorService;

  constructor(config: ServiceConfig) {
    super({
      name: 'service-registry',
      version: '1.0.0',
      ...config
    });

    this.services = new Map();
    this.metadata = new Map();
    this.registryEmitter = new EventEmitter();
    
    // Initialize health monitor
    this.healthMonitor = new HealthMonitorService({
      name: 'health-monitor',
      version: '1.0.0',
      dependencies: []
    });

    // Bind methods
    this.registerService = this.registerService.bind(this);
    this.unregisterService = this.unregisterService.bind(this);
    this.getService = this.getService.bind(this);
    this.startService = this.startService.bind(this);
    this.stopService = this.stopService.bind(this);
    this.startAll = this.startAll.bind(this);
    this.stopAll = this.stopAll.bind(this);
  }

  /**
   * Register a service with the registry
   */
  public registerService(service: BaseService, dependencies: string[] = []): void {
    const name = service.config.name;
    
    if (this.services.has(name)) {
      throw new Error(`Service ${name} is already registered`);
    }

    // Validate dependencies
    for (const dep of dependencies) {
      if (!this.services.has(dep)) {
        throw new Error(`Dependency ${dep} not found for service ${name}`);
      }
    }

    this.services.set(name, service);
    this.metadata.set(name, {
      name,
      version: service.config.version,
      status: service.getStatus(),
      dependencies
    });

    // Set up service event listeners
    service.on('status:change', (event) => {
      const meta = this.metadata.get(name);
      if (meta) {
        meta.status = event.currentStatus;
        
        // Update health monitor
        this.healthMonitor.registerService({
          service: name,
          version: meta.version,
          status: event.currentStatus,
          timestamp: event.timestamp,
          dependencies: this.getDependencyHealth(dependencies)
        });
      }
    });

    service.on('error', (error) => {
      const meta = this.metadata.get(name);
      if (meta) {
        meta.error = error;
        this.registryEmitter.emit('service:error', name, error);
      }
    });

    this.registryEmitter.emit('service:registered', name);
  }

  /**
   * Unregister a service from the registry
   */
  public async unregisterService(name: string): Promise<void> {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found`);
    }

    // Check if any other services depend on this one
    for (const [serviceName, meta] of this.metadata.entries()) {
      if (meta.dependencies.includes(name)) {
        throw new Error(
          `Cannot unregister service ${name} as it is a dependency of ${serviceName}`
        );
      }
    }

    // Stop the service if it's running
    if (service.getStatus() !== ServiceStatus.INACTIVE) {
      await service.stop();
    }

    this.services.delete(name);
    this.metadata.delete(name);
    this.healthMonitor.unregisterService(name);
    this.registryEmitter.emit('service:unregistered', name);
  }

  /**
   * Get a service by name
   */
  public getService<T extends BaseService>(name: string): T | undefined {
    return this.services.get(name) as T | undefined;
  }

  /**
   * Get service metadata
   */
  public getServiceMetadata(name: string): ServiceMetadata | undefined {
    return this.metadata.get(name);
  }

  /**
   * Get all registered services
   */
  public getAllServices(): Map<string, ServiceMetadata> {
    return new Map(this.metadata);
  }

  /**
   * Start a specific service
   */
  public async startService(name: string): Promise<void> {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found`);
    }

    const meta = this.metadata.get(name);
    if (!meta) {
      throw new Error(`Metadata for service ${name} not found`);
    }

    // Start dependencies first
    for (const dep of meta.dependencies) {
      await this.startService(dep);
    }

    if (service.getStatus() === ServiceStatus.INACTIVE) {
      await service.start();
      meta.startTime = new Date();
      meta.error = undefined;
      this.registryEmitter.emit('service:started', name);
    }
  }

  /**
   * Stop a specific service
   */
  public async stopService(name: string): Promise<void> {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found`);
    }

    // Check if any running services depend on this one
    for (const [serviceName, meta] of this.metadata.entries()) {
      if (meta.dependencies.includes(name) && 
          this.services.get(serviceName)?.getStatus() !== ServiceStatus.INACTIVE) {
        throw new Error(
          `Cannot stop service ${name} as it is a dependency of running service ${serviceName}`
        );
      }
    }

    if (service.getStatus() !== ServiceStatus.INACTIVE) {
      await service.stop();
      const meta = this.metadata.get(name);
      if (meta) {
        meta.stopTime = new Date();
      }
      this.registryEmitter.emit('service:stopped', name);
    }
  }

  /**
   * Start all services in dependency order
   */
  public async startAll(): Promise<void> {
    const started = new Set<string>();
    const failed = new Set<string>();

    const startService = async (name: string): Promise<void> => {
      if (started.has(name) || failed.has(name)) return;

      const meta = this.metadata.get(name);
      if (!meta) return;

      // Start dependencies first
      for (const dep of meta.dependencies) {
        try {
          await startService(dep);
        } catch (error) {
          failed.add(dep);
          throw error;
        }
      }

      // If any dependency failed, we can't start this service
      if (meta.dependencies.some(dep => failed.has(dep))) {
        failed.add(name);
        throw new Error(`Cannot start ${name} due to failed dependencies`);
      }

      try {
        await this.startService(name);
        started.add(name);
      } catch (error) {
        failed.add(name);
        throw error;
      }
    };

    // Start all services
    for (const name of this.services.keys()) {
      try {
        await startService(name);
      } catch (error) {
        // Log error but continue with other services
        console.error(`Failed to start service ${name}:`, error);
      }
    }
  }

  /**
   * Stop all services in reverse dependency order
   */
  public async stopAll(): Promise<void> {
    const stopped = new Set<string>();

    const stopService = async (name: string): Promise<void> => {
      if (stopped.has(name)) return;

      // Stop dependent services first
      for (const [serviceName, meta] of this.metadata.entries()) {
        if (meta.dependencies.includes(name)) {
          await stopService(serviceName);
        }
      }

      try {
        await this.stopService(name);
        stopped.add(name);
      } catch (error) {
        console.error(`Failed to stop service ${name}:`, error);
        throw error;
      }
    };

    // Stop all services
    for (const name of this.services.keys()) {
      try {
        await stopService(name);
      } catch (error) {
        // Log error but continue with other services
        console.error(`Failed to stop service ${name}:`, error);
      }
    }
  }

  /**
   * Get health status of service dependencies
   */
  private getDependencyHealth(dependencies: string[]): Record<string, { status: ServiceStatus }> {
    const health: Record<string, { status: ServiceStatus }> = {};
    
    for (const dep of dependencies) {
      const service = this.services.get(dep);
      if (service) {
        health[dep] = {
          status: service.getStatus()
        };
      }
    }

    return health;
  }

  /**
   * Subscribe to registry events
   */
  public on<K extends keyof ServiceRegistryEvents>(
    event: K,
    listener: ServiceRegistryEvents[K]
  ): this {
    this.registryEmitter.on(event, listener);
    return this;
  }

  /**
   * Start the service registry
   */
  protected async onStart(): Promise<void> {
    // Start the health monitor first
    await this.healthMonitor.start();
    
    // Register ourselves with the health monitor
    this.healthMonitor.registerService({
      service: this.config.name,
      version: this.config.version,
      status: this.getStatus(),
      timestamp: new Date(),
      dependencies: {}
    });
  }

  /**
   * Stop the service registry
   */
  protected async onStop(): Promise<void> {
    // Stop all services first
    await this.stopAll();
    
    // Stop the health monitor
    await this.healthMonitor.stop();
    
    // Clean up
    this.services.clear();
    this.metadata.clear();
    this.registryEmitter.removeAllListeners();
  }
}
