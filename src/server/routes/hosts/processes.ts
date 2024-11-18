import { Router } from 'express';
import type { ProcessInfo } from '../../../types/metrics';
import { ApiError } from '../../../types/error';
import { logger } from '../../utils/logger';
import { db } from '../../db';
import { createProcessService } from '../../services/process';
import { ProcessMonitorFactory } from '../../services/process/process-monitor-factory';
import { ProcessCacheImpl } from '../../services/process/process-cache';
import { hostService } from '../../services/host.service';
import { io } from '../../server';

const router = Router();

// Initialize process monitoring
const processCache = new ProcessCacheImpl();
const monitorFactory = new ProcessMonitorFactory(
  io,
  processCache,
  hostService.listProcesses.bind(hostService),
  hostService.getHost.bind(hostService)
);

const processService = createProcessService({
  monitorFactory,
  defaultInterval: 5000, // 5 seconds
  maxMonitoredHosts: 100,
  includeChildren: true,
  excludeSystemProcesses: false,
  sortBy: 'cpu',
  sortOrder: 'desc',
  maxProcesses: 100
});

router.get('/:hostId/processes', async (req, res, next) => {
  try {
    const { hostId } = req.params;

    // Get host from database
    const result = await db.query(
      'SELECT * FROM hosts WHERE id = $1',
      [hostId]
    );
    const host = result.rows[0];

    if (!host) {
      throw new ApiError('Host not found', 404);
    }

    // Get processes using the correct method name
    const processes = await processService.getProcesses(hostId);

    res.json({
      success: true,
      data: processes,
    });
  } catch (error) {
    logger.error('Failed to list processes:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      hostId: req.params.hostId,
    });
    next(error);
  }
});

router.post('/:hostId/processes/:pid/kill', async (req, res, next) => {
  try {
    const { hostId, pid } = req.params;
    const { signal } = req.body;

    // Get host from database
    const result = await db.query(
      'SELECT * FROM hosts WHERE id = $1',
      [hostId]
    );
    const host = result.rows[0];

    if (!host) {
      throw new ApiError('Host not found', 404);
    }

    // Kill process with correct parameter order (hostId, pid, signal)
    await processService.killProcess(hostId, parseInt(pid, 10), signal);

    res.json({
      success: true,
    });
  } catch (error) {
    logger.error('Failed to kill process:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      hostId: req.params.hostId,
      pid: req.params.pid,
    });
    next(error);
  }
});

export default router;
