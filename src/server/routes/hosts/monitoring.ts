import type { Request, Response } from 'express';
import type { Host } from '../../../types/models-shared';

import { ApiError } from '../../../types/error';
import type { LogMetadata } from '../../../types/logger';
import cache from '../../cache';
import { errorAggregator } from '../../services/errorAggregator';
import { logger } from '../../utils/logger';

export async function invalidateHostCache(req: Request, res: Response): Promise<void> {
  const { hostId } = req.params;

  try {
    // Invalidate host cache
    await cache.removeHost(hostId);
    logger.info('Host cache invalidated', { hostId: String(hostId) });
    res.json({ success: true });
  } catch (error) {
    const metadata: LogMetadata = {
      hostId: String(hostId),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to invalidate host cache:', metadata);
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
  logger.info('Starting host monitoring', { hostId: host.id });
  // TODO: Implement host monitoring
}

export async function stopHostMonitoring(host: Host): Promise<void> {
  logger.info('Stopping host monitoring', { hostId: host.id });
  // TODO: Implement host monitoring
}

export async function getMonitoringStatus(host: Host): Promise<boolean> {
  // TODO: Implement monitoring status check
  return false;
}

export async function getMonitoredHosts(): Promise<Host[]> {
  // TODO: Implement monitored hosts retrieval
  return [];
}

private async checkHostMetrics(host: Host): Promise<void> {
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
    }

    // Check memory usage
    if (metrics.memoryUsage.usedPercent > 95) {
      logger.critical(`Critical memory usage on host ${host.name}`, {
        hostId: host.id,
        memoryUsage: metrics.memoryUsage,
        notify: true,
      });
    }

    // Check CPU load
    if (metrics.cpuLoad.loadAvg15 > 0.9) {
      logger.critical(`High CPU load on host ${host.name}`, {
        hostId: host.id,
        cpuLoad: metrics.cpuLoad,
        notify: true,
      });
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
    }

    await this.updateHostStatus(host, 'running');
  } catch (error) {
    logger.error(`Failed to check metrics for host ${host.name}:`, {
      hostId: host.id,
      error,
    });
    await this.updateHostStatus(host, 'error');
  }
}
