import { Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ServiceRegistry } from './service-registry';
import { ServiceFactory } from './service-factory';
import { HealthMonitorService } from './health-monitor';
import { ServiceManager } from './service-manager';
import { ServiceMetricsCollector } from './service-metrics';
import { ServiceLogger } from './service-logger';

@Module({
  providers: [
    {
      provide: ServiceRegistry,
      useFactory: () => new ServiceRegistry({
        name: 'service-registry',
        version: '1.0.0'
      })
    },
    {
      provide: ServiceFactory,
      useFactory: (registry: ServiceRegistry) => new ServiceFactory({
        registry,
        defaultConfig: {
          version: '1.0.0'
        }
      }),
      inject: [ServiceRegistry]
    },
    {
      provide: HealthMonitorService,
      useFactory: () => new HealthMonitorService({
        name: 'health-monitor',
        version: '1.0.0'
      })
    },
    {
      provide: ServiceManager,
      useFactory: (
        registry: ServiceRegistry,
        factory: ServiceFactory,
        healthMonitor: HealthMonitorService
      ) => new ServiceManager(registry, factory, healthMonitor, {
        autoStart: true,
        startTimeout: 30000,
        stopTimeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
      }),
      inject: [ServiceRegistry, ServiceFactory, HealthMonitorService]
    },
    {
      provide: ServiceMetricsCollector,
      useFactory: () => new ServiceMetricsCollector({
        name: 'service-metrics',
        version: '1.0.0',
        health: {
          interval: 30000,
          thresholds: {
            cpu: 80,
            memory: 80,
            latency: 1000,
            errorRate: 0.1
          }
        }
      })
    },
    {
      provide: ServiceLogger,
      useFactory: () => new ServiceLogger({
        name: 'service-logger',
        version: '1.0.0',
        maxLogs: 1000,
        flushInterval: 3600000 // 1 hour
      })
    }
  ],
  exports: [
    ServiceRegistry,
    ServiceFactory,
    HealthMonitorService,
    ServiceManager,
    ServiceMetricsCollector,
    ServiceLogger
  ]
})
export class ServicesModule implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly registry: ServiceRegistry,
    private readonly healthMonitor: HealthMonitorService,
    private readonly serviceManager: ServiceManager,
    private readonly metricsCollector: ServiceMetricsCollector,
    private readonly logger: ServiceLogger
  ) {}

  async onModuleInit() {
    // Start core services
    await this.registry.start();
    await this.healthMonitor.start();
    await this.metricsCollector.start();
    await this.logger.start();
  }

  async onModuleDestroy() {
    // Stop all services
    await this.registry.stop();
  }
}
