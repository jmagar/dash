import os from 'os';
import { SystemMetrics, ProcessMetrics, ServiceStatus, HealthCheckResponse } from '../types/middleware';
import { LoggingManager } from '../utils/logging/LoggingManager';

class MonitoringService {
  private static instance: MonitoringService;
  private serviceStatuses: Map<string, ServiceStatus>;
  private checkInterval: NodeJS.Timeout | null;
  private metricsHistory: {
    timestamp: Date;
    metrics: HealthCheckResponse;
  }[];
  private readonly CHECK_INTERVAL_MS = 60000; // 1 minute
  private readonly MAX_HISTORY_LENGTH = 100; // Keep last 100 checks

  private constructor() {
    this.serviceStatuses = new Map();
    this.checkInterval = null;
    this.metricsHistory = [];
  }

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  public startMonitoring(): void {
    if (this.checkInterval) {
      return;
    }

    // Perform initial health check
    this.performHealthCheck()
      .then(health => this.handleHealthCheck(health))
      .catch(error => LoggingManager.getInstance().error('Initial health check failed:', error));

    this.checkInterval = setInterval(() => {
      this.performHealthCheck()
        .then(health => this.handleHealthCheck(health))
        .catch(error => {
          LoggingManager.getInstance().error('Health check failed:', error);
          this.updateAllServicesUnhealthy('Health check failed');
        });
    }, this.CHECK_INTERVAL_MS);

    LoggingManager.getInstance().info('Health monitoring started');
  }

  public stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      LoggingManager.getInstance().info('Health monitoring stopped');
    }
  }

  private updateAllServicesUnhealthy(error: string): void {
    for (const [name] of this.serviceStatuses) {
      this.updateServiceStatus(name, {
        name,
        status: 'unhealthy',
        error,
        lastCheck: new Date()
      });
    }
  }

  private handleHealthCheck(health: HealthCheckResponse): void {
    // Store metrics in history
    this.metricsHistory.push({
      timestamp: new Date(),
      metrics: health
    });

    // Trim history if needed
    if (this.metricsHistory.length > this.MAX_HISTORY_LENGTH) {
      this.metricsHistory.shift();
    }

    if (health.status !== 'healthy') {
      LoggingManager.getInstance().warn('System health degraded:', health);
    }

    // Check for critical thresholds
    this.checkCriticalThresholds(health);
  }

  private checkCriticalThresholds(health: HealthCheckResponse): void {
    const { system, process } = health;

    // Check CPU usage
    if (system.cpu.usage > 90) {
      LoggingManager.getInstance().error('Critical CPU usage detected:', {
        usage: system.cpu.usage,
        threshold: 90
      });
    }

    // Check memory usage
    if (system.memory.usagePercent > 90) {
      LoggingManager.getInstance().error('Critical memory usage detected:', {
        usage: system.memory.usagePercent,
        free: system.memory.free,
        threshold: 90
      });
    }

    // Check process memory
    const heapUsed = process.memoryUsage.heapUsed;
    const heapTotal = process.memoryUsage.heapTotal;
    const heapUsage = (heapUsed / heapTotal) * 100;

    if (heapUsage > 85) {
      LoggingManager.getInstance().error('Critical heap usage detected:', {
        usage: heapUsage,
        used: heapUsed,
        total: heapTotal,
        threshold: 85
      });
    }

    // Check for consecutive failures
    const recentChecks = this.metricsHistory.slice(-5);
    const consecutiveUnhealthy = recentChecks.every(check => 
      check.metrics.status === 'unhealthy'
    );

    if (consecutiveUnhealthy) {
      LoggingManager.getInstance().error('System consistently unhealthy:', {
        lastChecks: recentChecks.map(check => ({
          timestamp: check.timestamp,
          status: check.metrics.status
        }))
      });
    }
  }

  public async getSystemMetrics(): Promise<SystemMetrics> {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    try {
      // Get disk usage (platform-specific)
      const disk = await this.getDiskUsage();

      return {
        cpu: {
          usage: this.calculateCpuUsage(cpus),
          count: cpus.length,
          model: cpus[0].model
        },
        memory: {
          total: totalMem,
          used: usedMem,
          free: freeMem,
          usagePercent: (usedMem / totalMem) * 100
        },
        disk
      };
    } catch (error) {
      LoggingManager.getInstance().error('Failed to get system metrics:', error);
      throw error;
    }
  }

  private async getDiskUsage(): Promise<SystemMetrics['disk']> {
    // This is a placeholder. In production, you'd want to use a proper
    // disk usage checking library or system command
    return {
      total: 0,
      used: 0,
      free: 0,
      usagePercent: 0
    };
  }

  public getProcessMetrics(): ProcessMetrics {
    return {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      resourceUsage: process.resourceUsage()
    };
  }

  public async registerService(name: string): Promise<void> {
    if (this.serviceStatuses.has(name)) {
      LoggingManager.getInstance().warn(`Service ${name} already registered`);
      return;
    }

    this.serviceStatuses.set(name, {
      name,
      status: 'healthy',
      lastCheck: new Date(),
    });

    LoggingManager.getInstance().info(`Service ${name} registered for monitoring`);
  }

  public async updateServiceStatus(name: string, status: ServiceStatus): Promise<void> {
    const currentStatus = this.serviceStatuses.get(name);
    
    if (!currentStatus) {
      LoggingManager.getInstance().warn(`Attempting to update unknown service: ${name}`);
      await this.registerService(name);
    }

    const newStatus = {
      ...status,
      lastCheck: new Date()
    };

    this.serviceStatuses.set(name, newStatus);

    if (newStatus.status !== 'healthy') {
      LoggingManager.getInstance().warn(`Service ${name} status changed to ${newStatus.status}:`, {
        error: newStatus.error,
        latency: newStatus.latency
      });
    }
  }

  public async performHealthCheck(): Promise<HealthCheckResponse> {
    try {
      const [systemMetrics, processMetrics] = await Promise.all([
        this.getSystemMetrics(),
        this.getProcessMetrics()
      ]);

      const services = Array.from(this.serviceStatuses.values());
      const unhealthyServices = services.filter(s => s.status === 'unhealthy');
      const degradedServices = services.filter(s => s.status === 'degraded');

      let status: HealthCheckResponse['status'] = 'healthy';
      if (unhealthyServices.length > 0) {
        status = 'unhealthy';
      } else if (degradedServices.length > 0) {
        status = 'degraded';
      }

      // Check if any critical metrics are exceeded
      if (status === 'healthy') {
        if (systemMetrics.cpu.usage > 90 || 
            systemMetrics.memory.usagePercent > 90) {
          status = 'degraded';
        }
      }

      return {
        status,
        timestamp: new Date(),
        version: process.env.npm_package_version || '0.0.0',
        system: systemMetrics,
        process: processMetrics,
        services
      };
    } catch (error) {
      LoggingManager.getInstance().error('Health check failed:', error);
      throw error;
    }
  }

  private calculateCpuUsage(cpus: os.CpuInfo[]): number {
    return cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b);
      const idle = cpu.times.idle;
      return acc + ((total - idle) / total) * 100;
    }, 0) / cpus.length;
  }

  public getMetricsHistory(): { timestamp: Date; metrics: HealthCheckResponse }[] {
    return [...this.metricsHistory];
  }
}

export const monitoringService = MonitoringService.getInstance();

