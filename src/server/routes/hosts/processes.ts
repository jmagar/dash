import { Router, Response, NextFunction, IRouter, Request, RequestHandler } from 'express';
import { createApiError } from '../../utils/error';
import { db } from '../../db';
import { createProcessService } from '../../services/process';
import { ProcessMonitorFactory } from '../../services/process/process-monitor-factory';
import { ProcessCacheImpl } from '../../services/process/process-cache';
import { hostService } from '../../services/host.service';
import { Server } from 'socket.io';
import { LoggingManager } from '../../managers/LoggingManager';
import { ProcessInfo, ProcessId, createProcessId, ProcessCache } from '../../services/process/types';
import { LogMetadata } from '../../../types/logger';
import type { Host } from '../../../types/models-shared';
import type { Process, ProcessStatus } from '../../../types/process';
import { ApiError } from '../../../types/error';
import { getHostService } from '../../services/host.service';
import { getProcessService } from '../../services/process.service';

// Declare external io variable
declare const io: Server;

const router: IRouter = Router({ mergeParams: true });
const logger = LoggingManager.getInstance();

// Extend ProcessCacheImpl to implement required clear method and handle ProcessId
class ExtendedProcessCache extends ProcessCacheImpl implements ProcessCache {
  private processCache: Map<string, Map<ProcessId, ProcessInfo>> = new Map();

  get(hostId: string): Map<ProcessId, ProcessInfo> | undefined {
    return this.processCache.get(hostId);
  }

  set(hostId: string, processes: Map<ProcessId, ProcessInfo>): void {
    this.processCache.set(hostId, processes);
  }

  delete(hostId: string): void {
    this.processCache.delete(hostId);
  }

  async clear(): Promise<void> {
    await Promise.resolve();
    this.processCache.clear();
  }
}

const processCache = new ExtendedProcessCache();

const monitorFactory = new ProcessMonitorFactory(
  io,
  processCache,
  hostService.listProcesses.bind(hostService),
  hostService.getHost.bind(hostService)
);

const processService = createProcessService(io, {
  monitorFactory,
  defaultInterval: 5000, // 5 seconds
  maxMonitoredHosts: 100,
  includeChildren: true,
  excludeSystemProcesses: false,
  sortBy: 'cpu',
  sortOrder: 'desc',
  maxProcesses: 100
});

interface ProcessFilter {
  status?: ProcessStatus;
  name?: string;
  command?: string;
  pid?: number;
}

interface ProcessSort {
  field: keyof Process;
  direction: 'asc' | 'desc';
}

interface ProcessQuery {
  filter?: ProcessFilter;
  sort?: ProcessSort;
  limit?: number;
  offset?: number;
}

interface ProcessStats {
  total: number;
  running: number;
  stopped: number;
  failed: number;
  memory: number;
  cpu: number;
}

export async function listProcesses(host: Host, query: ProcessQuery = {}): Promise<Process[]> {
  try {
    const hostService = await getHostService();
    const processService = await getProcessService();

    // Verify host is connected
    if (!await hostService.isHostConnected(host.id)) {
      throw new ApiError('Host is not connected', null, 400);
    }

    // Get processes with filtering and sorting
    const processes = await processService.listProcesses(host.id);
    let filtered = processes;

    // Apply filters
    if (query.filter) {
      filtered = filtered.filter(process => {
        if (query.filter?.status && process.status !== query.filter.status) {
          return false;
        }
        if (query.filter?.name && !process.name.includes(query.filter.name)) {
          return false;
        }
        if (query.filter?.command && !process.command.includes(query.filter.command)) {
          return false;
        }
        if (query.filter?.pid && process.pid !== query.filter.pid) {
          return false;
        }
        return true;
      });
    }

    // Apply sorting
    if (query.sort) {
      filtered.sort((a, b) => {
        const aValue = a[query.sort!.field];
        const bValue = b[query.sort!.field];
        const direction = query.sort!.direction === 'asc' ? 1 : -1;
        return direction * (aValue < bValue ? -1 : aValue > bValue ? 1 : 0);
      });
    }

    // Apply pagination
    if (query.offset || query.limit) {
      filtered = filtered.slice(query.offset || 0, (query.offset || 0) + (query.limit || filtered.length));
    }

    return filtered;
  } catch (error) {
    logger.error('Failed to list processes', {
      hostId: host.id,
      error
    } as LogMetadata);
    throw error;
  }
}

export async function getProcess(host: Host, pid: number): Promise<Process> {
  try {
    const hostService = await getHostService();
    const processService = await getProcessService();

    // Verify host is connected
    if (!await hostService.isHostConnected(host.id)) {
      throw new ApiError('Host is not connected', null, 400);
    }

    // Get process
    const process = await processService.getProcess(host.id, pid);
    if (!process) {
      throw new ApiError('Process not found', null, 404);
    }

    return process;
  } catch (error) {
    logger.error('Failed to get process', {
      hostId: host.id,
      pid,
      error
    } as LogMetadata);
    throw error;
  }
}

export async function killProcess(host: Host, pid: number): Promise<void> {
  try {
    const hostService = await getHostService();
    const processService = await getProcessService();

    // Verify host is connected
    if (!await hostService.isHostConnected(host.id)) {
      throw new ApiError('Host is not connected', null, 400);
    }

    // Kill process
    await processService.killProcess(host.id, pid);
  } catch (error) {
    logger.error('Failed to kill process', {
      hostId: host.id,
      pid,
      error
    } as LogMetadata);
    throw error;
  }
}

export async function getProcessStats(host: Host): Promise<ProcessStats> {
  try {
    const hostService = await getHostService();
    const processService = await getProcessService();

    // Verify host is connected
    if (!await hostService.isHostConnected(host.id)) {
      throw new ApiError('Host is not connected', null, 400);
    }

    // Get all processes
    const processes = await processService.listProcesses(host.id);

    // Calculate stats
    const stats: ProcessStats = {
      total: processes.length,
      running: processes.filter(p => p.status === 'running').length,
      stopped: processes.filter(p => p.status === 'stopped').length,
      failed: processes.filter(p => p.status === 'failed').length,
      memory: processes.reduce((sum, p) => sum + (p.memory || 0), 0),
      cpu: processes.reduce((sum, p) => sum + (p.cpu || 0), 0)
    };

    return stats;
  } catch (error) {
    logger.error('Failed to get process stats', {
      hostId: host.id,
      error
    } as LogMetadata);
    throw error;
  }
}

type ProcessListParams = {
  [key: string]: string;
  hostId: string;
};

type KillProcessParams = {
  [key: string]: string;
  hostId: string;
  pid: string;
};

interface KillProcessBody {
  signal?: NodeJS.Signals;
}

// Helper to wrap async request handlers
const asyncHandler = <P extends Record<string, string>, B = unknown>(
  fn: (
    req: Request<P, any, B>,
    res: Response,
    next: NextFunction
  ) => Promise<void>
): RequestHandler => (req, res, next) => {
  Promise.resolve(fn(req as Request<P, any, B>, res, next)).catch(next);
};

router.get(
  '/:hostId/processes',
  asyncHandler<ProcessListParams>(async (req, res, next) => {
    try {
      const { hostId } = req.params;

      logger.info('Fetching processes for host', { hostId });

      const result = await db.query<{ id: string }>(
        'SELECT * FROM hosts WHERE id = $1',
        [hostId]
      );
      const host = result.rows[0];

      if (!host) {
        logger.warn('Host not found', { hostId });
        throw createApiError('Host not found', undefined, 404);
      }

      const processes = await listProcesses(host);

      logger.info('Successfully fetched processes', {
        hostId,
        processCount: processes.length
      });

      res.json({
        success: true,
        data: processes
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Failed to fetch processes', {
          hostId,
          error: error.message
        });
      }
      next(error);
    }
  })
);

router.post(
  '/:hostId/processes/:pid/kill',
  asyncHandler<KillProcessParams, KillProcessBody>(async (req, res, next) => {
    try {
      const { hostId, pid } = req.params;
      const signal = req.body.signal ?? ('SIGTERM' as NodeJS.Signals);

      logger.info('Attempting to kill process', {
        hostId,
        pid,
        signal
      });

      const result = await db.query<{ id: string }>(
        'SELECT * FROM hosts WHERE id = $1',
        [hostId]
      );
      const host = result.rows[0];

      if (!host) {
        logger.warn('Host not found when attempting to kill process', { hostId });
        throw createApiError('Host not found', undefined, 404);
      }

      await killProcess(host, parseInt(pid, 10));

      logger.info('Successfully killed process', {
        hostId,
        pid,
        signal
      });

      res.json({
        success: true
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Failed to kill process', {
          hostId,
          pid,
          signal,
          error: error.message
        });
      }
      next(error);
    }
  })
);

export default router;
