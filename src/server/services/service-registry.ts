import { Injectable } from '@nestjs/common';
import { BaseService } from './base.service';
import { ServiceStatus } from '../../types/status';
import { HealthMonitorService } from './health-monitor';
import { EventEmitter } from 'events';
import { LoggingManager } from '../managers/LoggingManager';

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

  constructor() {
    super({
      name: 'service-registry'
    });

    this.services = new Map();
    this.metadata = new Map();
    this.registryEmitter = new EventEmitter();
    this.healthMonitor = new HealthMonitorService({});
  }

  private getServiceStatus(_service: BaseService): ServiceStatus {
    return this.status === 'ready' ? ServiceStatus.ACTIVE : ServiceStatus.INACTIVE;
  }

  public registerService(name: string, service: BaseService): void {
    if (this.services.has(name)) {
      LoggingManager.getInstance().error(`Service ${name} already registered`);
      return;
    }

    const dependencies: string[] = [];
    this.services.set(name, service);
    
    this.metadata.set(name, {
      name,
      version: '1.0.0',
      status: this.getServiceStatus(service),
      dependencies
    });

    this.healthMonitor.registerService(name);
    this.registryEmitter.emit('service:registered', name);
  }

  public unregisterService(name: string): void {
    const service = this.services.get(name);
    if (!service) {
      LoggingManager.getInstance().error(`Service ${name} not found`);
      return;
    }

    this.healthMonitor.unregisterService(name);
    this.services.delete(name);
    this.metadata.delete(name);
    this.registryEmitter.emit('service:unregistered', name);
  }

  public startService(name: string): void {
    const service = this.services.get(name);
    if (!service) {
      LoggingManager.getInstance().error(`Service ${name} not found`);
      return;
    }

    try {
      const metadata = this.metadata.get(name);
      if (metadata) {
        metadata.status = ServiceStatus.ACTIVE;
        metadata.startTime = new Date();
        metadata.error = undefined;
      }
      this.registryEmitter.emit('service:started', name);
    } catch (error) {
      LoggingManager.getInstance().error(`Failed to start service ${name}`, { error: error as Error });
      throw error;
    }
  }

  public stopService(name: string): void {
    const service = this.services.get(name);
    if (!service) {
      LoggingManager.getInstance().error(`Service ${name} not found`);
      return;
    }

    try {
      const metadata = this.metadata.get(name);
      if (metadata) {
        metadata.status = ServiceStatus.INACTIVE;
        metadata.stopTime = new Date();
      }
      this.registryEmitter.emit('service:stopped', name);
    } catch (error) {
      LoggingManager.getInstance().error(`Failed to stop service ${name}`, { error: error as Error });
      throw error;
    }
  }

  public getService<T extends BaseService>(name: string): T | undefined {
    return this.services.get(name) as T;
  }

  public getServiceMetadata(name: string): ServiceMetadata | undefined {
    return this.metadata.get(name);
  }

  public getAllServices(): Map<string, BaseService> {
    return new Map(this.services);
  }

  public getAllMetadata(): Map<string, ServiceMetadata> {
    return new Map(this.metadata);
  }

  private getDependencyHealth(dependencies: string[]): Record<string, { status: ServiceStatus }> {
    const health: Record<string, { status: ServiceStatus }> = {};
    for (const dep of dependencies) {
      const service = this.services.get(dep);
      if (service) {
        health[dep] = {
          status: this.getServiceStatus(service)
        };
      }
    }
    return health;
  }

  public onStart(): void {
    this.healthMonitor.registerService('service-registry');
  }

  public onStop(): void {
    this.healthMonitor.unregisterService('service-registry');
  }
}
