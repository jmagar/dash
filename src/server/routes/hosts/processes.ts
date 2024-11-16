import { Router } from 'express';
import type { Request, Response } from '../../../types/express';
import type { Host, ApiResponse } from '../../../types/models-shared';
import type { ProcessInfo } from '../../services/process.service';
import { ApiError } from '../../../types/error';
import { logger } from '../../utils/logger';
import { processService } from '../../services/process.service';
import { db } from '../../db';

const router = Router({ mergeParams: true });

interface ProcessParams {
  hostId: string;
  pid?: string;
}

interface KillProcessRequest {
  signal?: string;
}

type ProcessResponse = ApiResponse<ProcessInfo[]>;

/**
 * List processes
 * GET /hosts/:hostId/processes
 */
router.get('/', async (req: Request<ProcessParams>, res: Response<ProcessResponse>) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', undefined, 401);
    }

    const result = await db.query<Host>(
      'SELECT * FROM hosts WHERE id = $1 AND user_id = $2',
      [req.params.hostId, req.user.id]
    );

    if (result.rows.length === 0) {
      throw new ApiError('Host not found', undefined, 404);
    }

    const processes = await processService.listProcesses(result.rows[0]);

    res.json({
      success: true,
      data: processes,
    });
  } catch (error) {
    logger.error('Failed to list processes:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.id,
      hostId: req.params.hostId,
    });
    throw error;
  }
});

/**
 * Kill process
 * POST /hosts/:hostId/processes/:pid/kill
 */
router.post('/:pid/kill', async (req: Request<ProcessParams, unknown, KillProcessRequest>, res: Response<ApiResponse>) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', undefined, 401);
    }

    if (!req.params.pid) {
      throw new ApiError('Process ID is required', undefined, 400);
    }

    const result = await db.query<Host>(
      'SELECT * FROM hosts WHERE id = $1 AND user_id = $2',
      [req.params.hostId, req.user.id]
    );

    if (result.rows.length === 0) {
      throw new ApiError('Host not found', undefined, 404);
    }

    const pid = parseInt(req.params.pid, 10);
    if (isNaN(pid)) {
      throw new ApiError('Invalid process ID', undefined, 400);
    }

    await processService.killProcess(result.rows[0], pid, req.body.signal);

    res.json({
      success: true,
      message: `Process ${pid} killed successfully`,
    });
  } catch (error) {
    logger.error('Failed to kill process:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.id,
      hostId: req.params.hostId,
      pid: req.params.pid,
    });
    throw error;
  }
});

/**
 * Start monitoring processes
 * POST /hosts/:hostId/processes/monitor
 */
router.post('/monitor', async (req: Request<ProcessParams>, res: Response<ApiResponse>) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', undefined, 401);
    }

    const result = await db.query<Host>(
      'SELECT * FROM hosts WHERE id = $1 AND user_id = $2',
      [req.params.hostId, req.user.id]
    );

    if (result.rows.length === 0) {
      throw new ApiError('Host not found', undefined, 404);
    }

    await processService.startMonitoringHost(result.rows[0]);

    res.json({
      success: true,
      message: 'Process monitoring started',
    });
  } catch (error) {
    logger.error('Failed to start process monitoring:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.id,
      hostId: req.params.hostId,
    });
    throw error;
  }
});

/**
 * Stop monitoring processes
 * DELETE /hosts/:hostId/processes/monitor
 */
router.delete('/monitor', async (req: Request<ProcessParams>, res: Response<ApiResponse>) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', undefined, 401);
    }

    const result = await db.query<Host>(
      'SELECT * FROM hosts WHERE id = $1 AND user_id = $2',
      [req.params.hostId, req.user.id]
    );

    if (result.rows.length === 0) {
      throw new ApiError('Host not found', undefined, 404);
    }

    processService.stopMonitoringHost(req.params.hostId);

    res.json({
      success: true,
      message: 'Process monitoring stopped',
    });
  } catch (error) {
    logger.error('Failed to stop process monitoring:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.id,
      hostId: req.params.hostId,
    });
    throw error;
  }
});

export default router;
