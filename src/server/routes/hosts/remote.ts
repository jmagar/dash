import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { CommandRequest, CommandResult, ProcessInfo } from '../../../types/models-shared';
import type { ApiResponse } from '../../../types/express';
import { ApiError } from '../../../types/error';
import { logger } from '../../utils/logger';
import { executionService } from '../../services/execution.service';
import { ProcessService, createProcessService } from '../../services/process';
import { hostService } from '../../services/host.service';
import { Server } from 'socket.io';
import type { DefaultEventsMap } from 'socket.io/dist/typed-events';

const router = Router();

interface HostParams {
  hostId: string;
}

interface ProcessParams extends HostParams {
  pid: string;
}

interface KillProcessBody {
  signal?: string;
}

interface StreamCommandBody {
  command: string;
}

let io: Server<DefaultEventsMap>;

export function setSocketIO(socketIO: Server<DefaultEventsMap>) {
  io = socketIO;
}

// Initialize process service
const processService = createProcessService(io, {
  monitorFactory: new ProcessMonitorFactory(
    io,
    new ProcessCacheImpl(),
    hostService.listProcesses.bind(hostService),
    hostService.getHost.bind(hostService)
  ),
  defaultInterval: 5000,
  maxMonitoredHosts: 100,
  includeChildren: true,
  excludeSystemProcesses: false,
  sortBy: 'cpu',
  sortOrder: 'desc',
  maxProcesses: 100
});

/**
 * Convert CommandRequest to Command
 */
function createCommand(hostId: string, request: CommandRequest): Command {
  const now = new Date();
  return {
    id: Math.random().toString(36).substring(2, 15),
    hostId,
    command: request.command,
    args: request.args,
    cwd: request.cwd,
    env: request.env,
    request,
    status: 'pending',
    createdAt: now,
    startedAt: now,
    updatedAt: now,
  };
}

/**
 * Execute command on host
 * POST /hosts/:hostId/execute
 */
router.post('/:hostId/execute', (async (req: Request<HostParams, ApiResponse<CommandResult>, CommandRequest>, res: Response, next: NextFunction) => {
  try {
    const { hostId } = req.params;

    const host = await hostService.getHost(hostId);

    if (!host) {
      throw new ApiError('Host not found', undefined, 404);
    }

    const command = createCommand(hostId, req.body);
    const result = await executionService.executeCommand(host, command);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Failed to execute command on host', { error: error.message });
    }
    next(error);
  }
}) as express.RequestHandler);

/**
 * Stream command output
 * POST /hosts/:hostId/stream
 */
router.post('/:hostId/stream', (async (req: Request<HostParams, ApiResponse<void>, StreamCommandBody>, res: Response, next: NextFunction) => {
  try {
    const { hostId } = req.params;
    const { command } = req.body;

    const host = await hostService.getHost(hostId);

    if (!host) {
      throw new ApiError('Host not found', undefined, 404);
    }

    const commandObj = createCommand(hostId, {
      command,
      shell: true // Use shell for PTY-like behavior
    });

    await executionService.executeCommand(host, commandObj);

    res.json({
      success: true,
      message: 'Stream started'
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Failed to stream command output', { error: error.message });
    }
    next(error);
  }
}) as express.RequestHandler);

/**
 * Get process status
 * GET /hosts/:hostId/processes/:pid
 */
router.get('/:hostId/processes/:pid', (async (req: Request<ProcessParams, ApiResponse<ProcessInfo>, void>, res: Response, next: NextFunction) => {
  try {
    const { hostId, pid } = req.params;

    const host = await hostService.getHost(hostId);

    if (!host) {
      throw new ApiError('Host not found', undefined, 404);
    }

    if (!processService.isMonitored(hostId)) {
      await processService.monitor(hostId);
    }

    const process = await processService.getProcessById(hostId, parseInt(pid, 10));

    if (!process) {
      throw new ApiError('Process not found', undefined, 404);
    }

    res.json({
      success: true,
      data: process
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Failed to get process status', { error: error.message });
    }
    next(error);
  }
}) as express.RequestHandler);

/**
 * List processes
 * GET /hosts/:hostId/processes
 */
router.get('/:hostId/processes', (async (req: Request<HostParams, ApiResponse<ProcessInfo[]>, void>, res: Response, next: NextFunction) => {
  try {
    const { hostId } = req.params;

    const host = await hostService.getHost(hostId);

    if (!host) {
      throw new ApiError('Host not found', undefined, 404);
    }

    if (!processService.isMonitored(hostId)) {
      await processService.monitor(hostId);
    }

    const processes = await processService.getProcesses(hostId);

    res.json({
      success: true,
      data: processes
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Failed to list processes', { error: error.message });
    }
    next(error);
  }
}) as express.RequestHandler);

/**
 * Kill process
 * POST /hosts/:hostId/processes/:pid/kill
 */
router.post('/:hostId/processes/:pid/kill', (async (req: Request<ProcessParams, ApiResponse<void>, KillProcessBody>, res: Response, next: NextFunction) => {
  try {
    const { hostId, pid } = req.params;
    const { signal } = req.body;

    const host = await hostService.getHost(hostId);

    if (!host) {
      throw new ApiError('Host not found', undefined, 404);
    }

    if (!processService.isMonitored(hostId)) {
      await processService.monitor(hostId);
    }

    await processService.killProcess(hostId, parseInt(pid, 10), signal);

    res.json({
      success: true
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Failed to kill process', { error: error.message });
    }
    next(error);
  }
}) as express.RequestHandler);

export default router;
