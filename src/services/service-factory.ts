import { Injectable, Type } from '@nestjs/common';
import { BaseService, ServiceConfig } from './base-service';
import { ServiceRegistry } from './service-registry';
import { validateServiceStatus } from '../utils/status-validator';
import { ServiceStatus } from '../types/status';

export interface ServiceFactoryConfig {
  registry: ServiceRegistry;
  defaultConfig?: Partial<ServiceConfig>;
}

@Injectable()
export class ServiceFactory {
  private readonly registry: ServiceRegistry;
  private readonly defaultConfig: Partial<ServiceConfig>;

  constructor(config: ServiceFactoryConfig) {
    this.registry = config.registry;
    this.defaultConfig = config.defaultConfig || {};
  }

  /**
   * Create and register a new service instance
   */
  public async createService<T extends BaseService>(
    ServiceClass: Type<T>,
    config: Partial<ServiceConfig> & { name: string },
    dependencies: string[] = []
  ): Promise<T> {
    // Merge configs
    const serviceConfig: ServiceConfig = {
      ...this.defaultConfig,
      ...config,
      version: config.version || '1.0.0'
    };

    // Create service instance
    const service = new ServiceClass(serviceConfig);

    // Validate initial status
    const validation = validateServiceStatus(service.getStatus());
    if (!validation.isValid) {
      throw new Error(`Invalid initial status for service ${config.name}: ${validation.message}`);
    }

    // Register with service registry
    this.registry.registerService(service, dependencies);

    return service;
  }

  /**
   * Create multiple services with dependencies
   */
  public async createServices(
    services: Array<{
      ServiceClass: Type<BaseService>;
      config: Partial<ServiceConfig> & { name: string };
      dependencies?: string[];
    }>
  ): Promise<Map<string, BaseService>> {
    const created = new Map<string, BaseService>();

    // Helper function to create a service and its dependencies
    const createWithDependencies = async (
      index: number,
      visited: Set<number>
    ): Promise<void> => {
      if (visited.has(index)) return;
      visited.add(index);

      const { ServiceClass, config, dependencies = [] } = services[index];

      // Create dependencies first
      for (const dep of dependencies) {
        const depIndex = services.findIndex(s => s.config.name === dep);
        if (depIndex === -1) {
          throw new Error(`Dependency ${dep} not found for service ${config.name}`);
        }
        await createWithDependencies(depIndex, visited);
      }

      // Create the service
      const service = await this.createService(
        ServiceClass,
        config,
        dependencies
      );

      created.set(config.name, service);
    };

    // Create all services in dependency order
    const visited = new Set<number>();
    for (let i = 0; i < services.length; i++) {
      await createWithDependencies(i, visited);
    }

    return created;
  }

  /**
   * Create a service configuration
   */
  public createServiceConfig(
    name: string,
    options: Partial<ServiceConfig> = {}
  ): ServiceConfig {
    return {
      ...this.defaultConfig,
      ...options,
      name,
      version: options.version || '1.0.0'
    };
  }

  /**
   * Get the service registry instance
   */
  public getRegistry(): ServiceRegistry {
    return this.registry;
  }
}
