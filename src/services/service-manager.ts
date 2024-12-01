import { Injectable } from '@nestjs/common';
import { BaseService } from './base-service';
import { ServiceRegistry } from './service-registry';
import { ServiceFactory } from './service-factory';
import { ServiceStatus } from '../types/status';
import { ServiceEvent, ServiceLifecycleEvent } from '../types/events';
import { ServiceError, ServiceOperationError, ServiceStateError } from '../types/errors';
import { IService } from '../types/base';
import { HealthMonitorService } from './health-monitor';
import { Result } from '../types/common';

export interface ServiceManagerConfig {
  autoStart?: boolean;
  startTimeout?: number;
  stopTimeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

const DEFAULT_CONFIG: Required<ServiceManagerConfig> = {
  autoStart: true,
  startTimeout: 30000,
  stopTimeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000
};

@Injectable()
export class ServiceManager extends BaseService {
  private readonly config: Required<ServiceManagerConfig>;
  private readonly managedServices: Map<string, IService>;

  constructor(
    private readonly registry: ServiceRegistry,
    private readonly factory: ServiceFactory,
    private readonly healthMonitor: HealthMonitorService,
    config: ServiceManagerConfig = {}
  ) {
    super({
      name: 'service-manager',
      version: '1.0.0'
    });

    this.config = {
      ...DEFAULT_CONFIG,
      ...config
    };

    this.managedServices = new Map();
  }

  /**
   * Start a service
   */
  async startService(serviceName: string): Promise<Result> {
    try {
      const service = this.managedServices.get(serviceName);
      if (!service) {
        throw new ServiceError('Service not found', 'SERVICE_NOT_FOUND', { serviceName });
      }

      if (service.status === ServiceStatus.RUNNING) {
        return { success: true };
      }

      if (service.status === ServiceStatus.STARTING) {
        throw new ServiceStateError(
          'Service is already starting',
          service.status,
          ServiceStatus.STOPPED,
          { serviceName }
        );
      }

      let attempts = 0;
      while (attempts < this.config.retryAttempts) {
        try {
          await this.startWithTimeout(service);
          return { success: true };
        } catch (error) {
          attempts++;
          if (attempts === this.config.retryAttempts) {
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        }
      }

      throw new ServiceOperationError(
        'Failed to start service after retries',
        'start',
        { serviceName, attempts }
      );
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Stop a service
   */
  async stopService(serviceName: string): Promise<Result> {
    try {
      const service = this.managedServices.get(serviceName);
      if (!service) {
        throw new ServiceError('Service not found', 'SERVICE_NOT_FOUND', { serviceName });
      }

      if (service.status === ServiceStatus.STOPPED) {
        return { success: true };
      }

      if (service.status === ServiceStatus.STOPPING) {
        throw new ServiceStateError(
          'Service is already stopping',
          service.status,
          ServiceStatus.RUNNING,
          { serviceName }
        );
      }

      await this.stopWithTimeout(service);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Start all services
   */
  async startAllServices(): Promise<Result> {
    try {
      const results = await Promise.all(
        Array.from(this.managedServices.keys()).map(name => this.startService(name))
      );

      const failed = results.filter(r => !r.success);
      if (failed.length > 0) {
        throw new ServiceOperationError(
          'Some services failed to start',
          'startAll',
          { failed }
        );
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Stop all services
   */
  async stopAllServices(): Promise<Result> {
    try {
      const results = await Promise.all(
        Array.from(this.managedServices.keys()).map(name => this.stopService(name))
      );

      const failed = results.filter(r => !r.success);
      if (failed.length > 0) {
        throw new ServiceOperationError(
          'Some services failed to stop',
          'stopAll',
          { failed }
        );
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  protected async onStart(): Promise<void> {
    if (this.config.autoStart) {
      await this.startAllServices();
    }
  }

  protected async onStop(): Promise<void> {
    await this.stopAllServices();
  }

  private async startWithTimeout(service: IService): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new ServiceOperationError(
          'Service start timeout',
          'start',
          { serviceName: service.name, timeout: this.config.startTimeout }
        ));
      }, this.config.startTimeout);

      service.start()
        .then(() => {
          clearTimeout(timeout);
          this.emitLifecycleEvent(service.name, 'service:start', ServiceStatus.RUNNING);
          resolve();
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  private async stopWithTimeout(service: IService): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new ServiceOperationError(
          'Service stop timeout',
          'stop',
          { serviceName: service.name, timeout: this.config.stopTimeout }
        ));
      }, this.config.stopTimeout);

      service.stop()
        .then(() => {
          clearTimeout(timeout);
          this.emitLifecycleEvent(service.name, 'service:stop', ServiceStatus.STOPPED);
          resolve();
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  private emitLifecycleEvent(
    serviceName: string,
    type: 'service:start' | 'service:stop' | 'service:restart',
    status: ServiceStatus
  ): void {
    const event: ServiceLifecycleEvent = {
      id: `lifecycle-${Date.now()}`,
      timestamp: new Date(),
      serviceName,
      type,
      payload: {
        status
      }
    };

    this.emit(event);
  }
}
