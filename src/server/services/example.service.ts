import { Injectable } from '@nestjs/common';
import { BaseService, ServiceConfig } from './base-service';
import { ServiceStatus } from '../types/status';

export interface ExampleServiceConfig extends ServiceConfig {
  workDelay?: number;
  healthCheckInterval?: number;
  degradationProbability?: number;
}

export interface ExampleServiceEvents {
  'work:start': (timestamp: Date) => void;
  'work:complete': (duration: number) => void;
  'health:check': (isHealthy: boolean) => void;
}

@Injectable()
export class ExampleService extends BaseService {
  private timer?: NodeJS.Timeout;
  private readonly workDelay: number;
  private readonly healthCheckInterval: number;
  private readonly degradationProbability: number;

  constructor(config: ExampleServiceConfig) {
    super({
      name: 'example-service',
      version: '1.0.0',
      ...config
    });

    this.workDelay = config.workDelay ?? 1000;
    this.healthCheckInterval = config.healthCheckInterval ?? 5000;
    this.degradationProbability = config.degradationProbability ?? 0.1;
  }

  /**
   * Example method that simulates work
   */
  public async doWork(): Promise<void> {
    if (this.getStatus() !== ServiceStatus.ACTIVE) {
      throw new Error('Service must be active to do work');
    }

    const startTime = Date.now();
    this.emit('work:start', new Date());

    try {
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, this.workDelay));
      
      const duration = Date.now() - startTime;
      this.emit('work:complete', duration);
    } catch (error) {
      this.setStatus(ServiceStatus.ERROR);
      throw error;
    }
  }

  /**
   * Perform a health check
   */
  private performHealthCheck(): void {
    const isHealthy = Math.random() >= this.degradationProbability;
    
    if (!isHealthy) {
      this.setStatus(ServiceStatus.DEGRADED);
    } else if (this.getStatus() === ServiceStatus.DEGRADED) {
      this.setStatus(ServiceStatus.ACTIVE);
    }

    this.emit('health:check', isHealthy);
  }

  protected async onStart(): Promise<void> {
    // Simulate startup tasks
    await new Promise(resolve => setTimeout(resolve, 500));

    // Start periodic health checks
    this.timer = setInterval(() => {
      this.performHealthCheck();
    }, this.healthCheckInterval);
  }

  protected async onStop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    // Simulate cleanup tasks
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  /**
   * Subscribe to example service events
   */
  public on<K extends keyof ExampleServiceEvents>(
    event: K,
    listener: ExampleServiceEvents[K]
  ): this {
    return super.on(event as any, listener);
  }
}
