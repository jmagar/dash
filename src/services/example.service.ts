import { Injectable } from '@nestjs/common';
import { BaseService, ServiceConfig } from './base-service';
import { ServiceStatus } from '../types/status';

@Injectable()
export class ExampleService extends BaseService {
  private timer?: NodeJS.Timeout;

  constructor(config: ServiceConfig) {
    super({
      name: 'example-service',
      version: '1.0.0',
      ...config
    });
  }

  /**
   * Example method that simulates work
   */
  public async doWork(): Promise<void> {
    if (this.getStatus() !== ServiceStatus.ACTIVE) {
      throw new Error('Service must be active to do work');
    }

    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  protected async onStart(): Promise<void> {
    // Simulate startup tasks
    await new Promise(resolve => setTimeout(resolve, 500));

    // Start a periodic health check
    this.timer = setInterval(() => {
      // Simulate random health issues
      if (Math.random() < 0.1) {
        this.setStatus(ServiceStatus.DEGRADED);
      } else {
        this.setStatus(ServiceStatus.ACTIVE);
      }
    }, 5000);
  }

  protected async onStop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    // Simulate cleanup tasks
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}
