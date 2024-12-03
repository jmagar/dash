import os from 'os';
import { MetricsManager } from '../metrics/MetricsManager';
import { ConfigManager } from '../config/ConfigManager';
import { DatabaseManager } from '../db/DatabaseManager';
import { StateManager } from '../state/StateManager';
import { logger } from '../logger';
import { LoggingManager } from '../../../../../../../../../../utils/logging/LoggingManager';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  details: {
    [key: string]: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      message?: string;
      lastCheck: Date;
      metrics?: Record<string, number>;
    };
  };
}

export class MonitoringManager {
  private static instance: MonitoringManager;
  private metricsManager: MetricsManager;
  private configManager: ConfigManager;
  private databaseManager: DatabaseManager;
  private stateManager: StateManager;
  private healthStatus: HealthStatus;
  private checkInterval: NodeJS.Timer | null = null;

  private constructor() {
    this.metricsManager = MetricsManager.getInstance();
    this.configManager = ConfigManager.getInstance();
    this.databaseManager = DatabaseManager.getInstance();
    this.stateManager = StateManager.getInstance();
    
    this.healthStatus = {
      status: 'healthy',
      details: {}
    };

    // Initialize system metrics
    this.initializeMetrics();
  }

  public static getInstance(): MonitoringManager {
    if (!MonitoringManager.instance) {
      MonitoringManager.instance = new MonitoringManager();
    }
    return MonitoringManager.instance;
  }

  private initializeMetrics() {
    // System metrics
    this.metricsManager.createGauge('system_cpu_usage', 'CPU usage percentage');
    this.metricsManager.createGauge('system_memory_usage', 'Memory usage in bytes');
    this.metricsManager.createGauge('system_memory_total', 'Total memory in bytes');
    this.metricsManager.createGauge('system_load_average', 'System load average');
    
    // Process metrics
    this.metricsManager.createGauge('process_cpu_usage', 'Process CPU usage percentage');
    this.metricsManager.createGauge('process_memory_usage', 'Process memory usage in bytes');
    this.metricsManager.createGauge('process_uptime', 'Process uptime in seconds');

    // Service health metrics
    this.metricsManager.createGauge('service_health_status', 'Service health status (0=unhealthy, 1=degraded, 2=healthy)');
  }

  public startMonitoring() {
    const interval = this.configManager.get<number>('monitoring.checkIntervalMs');
    
    this.checkInterval = setInterval(async () => {
      await this.checkHealth();
      this.updateMetrics();
    }, interval);

    loggerLoggingManager.getInstance().();
  }

  public stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      loggerLoggingManager.getInstance().();
    }
  }

  private async checkHealth(): Promise<void> {
    try {
      // Check database health
      const dbHealth = await this.checkDatabaseHealth();
      this.updateServiceHealth('database', dbHealth);

      // Check state manager health
      const stateHealth = await this.checkStateHealth();
      this.updateServiceHealth('state', stateHealth);

      // Check system health
      const systemHealth = this.checkSystemHealth();
      this.updateServiceHealth('system', systemHealth);

      // Update overall health status
      this.updateOverallHealth();

      // Store health status
      await this.stateManager.set('health:status', this.healthStatus);

    } catch (error) {
      loggerLoggingManager.getInstance().();
      this.healthStatus.status = 'unhealthy';
    }
  }

  private async checkDatabaseHealth() {
    try {
      await this.databaseManager.ping();
      return {
        status: 'healthy' as const,
        message: 'Database connection is healthy',
        lastCheck: new Date(),
        metrics: {
          connectionPool: await this.databaseManager.getPoolMetrics()
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy' as const,
        message: 'Database connection failed',
        lastCheck: new Date()
      };
    }
  }

  private async checkStateHealth() {
    try {
      await this.stateManager.ping();
      return {
        status: 'healthy' as const,
        message: 'State manager is healthy',
        lastCheck: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy' as const,
        message: 'State manager check failed',
        lastCheck: new Date()
      };
    }
  }

  private checkSystemHealth() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = os.loadavg()[0];
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const memoryUsagePercent = ((totalMemory - freeMemory) / totalMemory) * 100;

    const status = memoryUsagePercent > 90 || cpuUsage > 0.9
      ? 'degraded'
      : 'healthy';

    return {
      status,
      message: `System ${status}`,
      lastCheck: new Date(),
      metrics: {
        cpuUsage,
        memoryUsagePercent,
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal
      }
    };
  }

  private updateServiceHealth(
    service: string,
    health: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      message?: string;
      lastCheck: Date;
      metrics?: Record<string, number>;
    }
  ) {
    this.healthStatus.details[service] = health;
    
    const statusValue = health.status === 'healthy' ? 2 : health.status === 'degraded' ? 1 : 0;
    this.metricsManager.setGauge('service_health_status', statusValue, { service });
  }

  private updateOverallHealth() {
    const services = Object.values(this.healthStatus.details);
    
    if (services.some(s => s.status === 'unhealthy')) {
      this.healthStatus.status = 'unhealthy';
    } else if (services.some(s => s.status === 'degraded')) {
      this.healthStatus.status = 'degraded';
    } else {
      this.healthStatus.status = 'healthy';
    }
  }

  private updateMetrics() {
    // Update system metrics
    const cpuUsage = os.loadavg()[0];
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    this.metricsManager.setGauge('system_cpu_usage', cpuUsage);
    this.metricsManager.setGauge('system_memory_usage', usedMemory);
    this.metricsManager.setGauge('system_memory_total', totalMemory);
    this.metricsManager.setGauge('system_load_average', os.loadavg()[0]);

    // Update process metrics
    const processMemory = process.memoryUsage();
    this.metricsManager.setGauge('process_memory_usage', processMemory.heapUsed);
    this.metricsManager.setGauge('process_uptime', process.uptime());
  }

  public getHealthStatus(): HealthStatus {
    return this.healthStatus;
  }

  public async getDetailedMetrics() {
    const metrics = await this.metricsManager.getMetrics();
    const health = this.getHealthStatus();
    
    return {
      metrics,
      health,
      system: {
        os: {
          platform: os.platform(),
          release: os.release(),
          arch: os.arch(),
          cpus: os.cpus().length
        },
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          usage: process.memoryUsage()
        },
        uptime: {
          system: os.uptime(),
          process: process.uptime()
        }
      }
    };
  }
}

export default MonitoringManager.getInstance();

