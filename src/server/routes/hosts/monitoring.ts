import { LoggingManager } from '../../managers/utils/LoggingManager';
/**
 * @deprecated This file is being replaced by the new MetricsService.
 * All functionality should be migrated to src/server/services/metrics.service.ts
 * TODO: Remove this file once migration is complete.
 */

import type { Request, Response } from 'express';
import type { Host } from '../../../types/models-shared';
import { ApiError } from '../../../types/error';
import type { LogMetadata } from '../../../types/logger';
import cache from '../../cache';
import { errorAggregator } from '../../services/errorAggregator';
import { logger } from '../../utils/logger';
import { metrics, recordHostMetric } from '../../metrics';
import si from 'systeminformation';
import { Client as SSHClient } from 'ssh2';

interface HostMetrics {
  diskUsage: Array<{ usedPercent: number }>;
  memoryUsage: { usedPercent: number };
  cpuLoad: { loadAvg15: number };
  cpuInfo: { cores: number };
  systemLoad: number[];
}

// Map to store monitoring intervals for each host
const monitoringIntervals = new Map<string, NodeJS.Timeout>();

export class HostMonitor {
  // Make interval public and readonly
  public readonly monitoringInterval = 60000; // 1 minute

  async checkHostMetrics(host: Host): Promise<void> {
    try {
      const metrics = await this.getHostMetrics(host);

      // Check disk space
      const criticalDisks = metrics.diskUsage.filter(disk => disk.usedPercent > 90);
      if (criticalDisks.length > 0) {
        logger.critical(`Critical disk space on host ${host.name}`, {
          hostId: host.id,
          disks: criticalDisks,
          notify: true,
        });
        recordHostMetric(host.id, 'disk_critical', criticalDisks.length);
      }

      // Check memory usage
      if (metrics.memoryUsage.usedPercent > 95) {
        logger.critical(`Critical memory usage on host ${host.name}`, {
          hostId: host.id,
          memoryUsage: metrics.memoryUsage,
          notify: true,
        });
        recordHostMetric(host.id, 'memory_critical', metrics.memoryUsage.usedPercent);
      }

      // Check CPU load
      if (metrics.cpuLoad.loadAvg15 > 0.9) {
        logger.critical(`High CPU load on host ${host.name}`, {
          hostId: host.id,
          cpuLoad: metrics.cpuLoad,
          notify: true,
        });
        recordHostMetric(host.id, 'cpu_critical', metrics.cpuLoad.loadAvg15 * 100);
      }

      // Check system load
      const numCPUs = metrics.cpuInfo.cores;
      if (metrics.systemLoad[0] > numCPUs * 2) {
        logger.critical(`System overload on host ${host.name}`, {
          hostId: host.id,
          systemLoad: metrics.systemLoad,
          cpuCores: numCPUs,
          notify: true,
        });
        recordHostMetric(host.id, 'system_overload', metrics.systemLoad[0]);
      }

      // Record general metrics
      recordHostMetric(host.id, 'memory_usage', metrics.memoryUsage.usedPercent);
      recordHostMetric(host.id, 'cpu_load', metrics.cpuLoad.loadAvg15 * 100);
      recordHostMetric(host.id, 'system_load', metrics.systemLoad[0]);

      await this.updateHostStatus(host, 'running');
    } catch (error) {
      loggerLoggingManager.getInstance().(),
      });
      await this.updateHostStatus(host, 'error');
    }
  }

  private async getHostMetrics(host: Host): Promise<HostMetrics> {
    const ssh = new SSHClient();

    return new Promise<HostMetrics>((resolve, reject) => {
      ssh.on('ready', async () => {
        try {
          // Get disk usage
          const diskUsage = await this.executeCommand(ssh, 'df -P | grep -v ^Filesystem');
          const disks = diskUsage.split('\n').map(line => {
            const parts = line.trim().split(/\s+/);
            return {
              usedPercent: parseInt(parts[4].replace('%', '')),
            };
          });

          // Get memory usage
          const memInfo = await si.mem();
          const memoryUsage = {
            usedPercent: (memInfo.used / memInfo.total) * 100,
          };

          // Get CPU info and load
          const [cpuInfo, loadAvg] = await Promise.all([
            si.cpu(),
            si.currentLoad(),
          ]);

          const cpuLoad = {
            loadAvg15: loadAvg.avgLoad,
          };

          const systemLoad = (await this.executeCommand(ssh, 'cat /proc/loadavg'))
            .split(' ')
            .slice(0, 3)
            .map(Number);

          resolve({
            diskUsage: disks,
            memoryUsage,
            cpuLoad,
            cpuInfo: {
              cores: cpuInfo.cores,
            },
            systemLoad,
          });
        } catch (error) {
          reject(error);
        } finally {
          ssh.end();
        }
      }).connect({
        host: host.hostname,
        port: host.port,
        username: host.username,
        password: host.password,
        privateKey: host.privateKey,
        passphrase: host.passphrase,
      });

      ssh.on('error', (err) => {
        reject(err);
      });
    });
  }

  private async executeCommand(ssh: SSHClient, command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      ssh.exec(command, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        let output = '';
        let error = '';

        stream.on('data', (data: Buffer) => {
          output += data.toString();
        });

        stream.stderr.on('data', (data: Buffer) => {
          error += data.toString();
        });

        stream.on('close', (code: number) => {
          if (code !== 0) {
            reject(new Error(`Command failed with code ${code}: ${error}`));
          } else {
            resolve(output.trim());
          }
        });
      });
    });
  }

  private async updateHostStatus(host: Host, status: 'running' | 'error' | 'installing'): Promise<void> {
    try {
      // Update host data in cache
      const hostData = await cache.getHost(host.id);
      if (hostData) {
        const updatedHost = {
          ...JSON.parse(hostData),
          status: status === 'running' ? 'online' : status,
          lastSeen: new Date().toISOString(),
        };
        await cache.setHost(host.id, JSON.stringify(updatedHost));
      }

      // Record metric
      recordHostMetric(host.id, 'status', status === 'running' ? 1 : status === 'installing' ? 0.5 : 0);

      loggerLoggingManager.getInstance().();
    } catch (error) {
      loggerLoggingManager.getInstance().(),
      });
      throw error;
    }
  }
}

export async function invalidateHostCache(req: Request, res: Response): Promise<void> {
  const { hostId } = req.params;

  try {
    await cache.removeHost(hostId);
    loggerLoggingManager.getInstance().() });
    res.json({ success: true });
  } catch (error) {
    const metadata: LogMetadata = {
      hostId: String(hostId),
      error: error instanceof Error ? error.message : String(error),
    };
    loggerLoggingManager.getInstance().();
    errorAggregator.trackError(
      error instanceof Error ? error : new Error('Failed to invalidate host cache'),
      metadata,
    );

    const apiError = new ApiError(
      error instanceof Error ? error.message : 'Failed to invalidate host cache',
      undefined,
      500,
      metadata
    );
    res.status(apiError.status).json({
      success: false,
      error: apiError.message,
    });
  }
}

export async function startHostMonitoring(host: Host): Promise<void> {
  loggerLoggingManager.getInstance().();

  // Stop existing monitoring
  stopHostMonitoring(host);

  // Create new monitor instance
  const monitor = new HostMonitor();

  // Start monitoring interval with proper promise handling
  const interval = setInterval(() => {
    void monitor.checkHostMetrics(host).catch(error => {
      loggerLoggingManager.getInstance().(),
      });
    });
  }, monitor.monitoringInterval);

  // Store interval reference
  monitoringIntervals.set(host.id, interval);

  // Do initial check
  await monitor.checkHostMetrics(host);
}

export function stopHostMonitoring(host: Host): void {
  loggerLoggingManager.getInstance().();

  const interval = monitoringIntervals.get(host.id);
  if (interval) {
    clearInterval(interval);
    monitoringIntervals.delete(host.id);
  }
}

export function getMonitoringStatus(host: Host): boolean {
  return monitoringIntervals.has(host.id);
}

export async function getMonitoredHosts(): Promise<Host[]> {
  const monitoredHostIds = Array.from(monitoringIntervals.keys());
  const hosts: Host[] = [];

  for (const hostId of monitoredHostIds) {
    const hostData = await cache.getHost(hostId);
    if (hostData) {
      hosts.push(JSON.parse(hostData));
    }
  }

  return hosts;
}


