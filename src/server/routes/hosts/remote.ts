import { Router } from 'express';
import { createAuthHandler, type ApiResponse, type RequestQuery, type Response } from '../../../types/express';
import type { CommandRequest, Command, CommandResult } from '../../../types/models-shared';
import type { ProcessInfo } from '../../../types/process';
import { ApiError } from '../../../types/error';
import { logger } from '../../utils/logger';
import { executionService } from '../../services/execution.service';
import { ProcessService, createProcessService } from '../../services/process';
import { hostService } from '../../services/host.service';
import { io } from '../../server';
import { ProcessMonitorFactory } from '../../services/process/process-monitor-factory';
import { ProcessCacheImpl } from '../../services/process/process-cache';
import { LoggingManager } from '../../managers/utils/LoggingManager';

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

const router = Router();

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
router.post('/:hostId/execute', createAuthHandler<
  HostParams,
  ApiResponse<CommandResult>,
  CommandRequest,
  RequestQuery
>((req, res, next) => {
  const { hostId } = req.params;

  return hostService.getHost(hostId)
    .then(host => {
      if (!host) {
        throw new ApiError('Host not found', undefined, 404);
      }

      const command = createCommand(hostId, req.body);
      return executionService.executeCommand(host, command);
    })
    .then(result => {
      res.json({
        success: true,
        data: result
      });
    })
    .catch(error => {
      loggerLoggingManager.getInstance().();
      next(error);
    });
}));

/**
 * Stream command output
 * POST /hosts/:hostId/stream
 */
router.post('/:hostId/stream', createAuthHandler<
  HostParams,
  ApiResponse<void>,
  StreamCommandBody,
  RequestQuery
>((req, res, next) => {
  const { hostId } = req.params;
  const { command } = req.body;

  return hostService.getHost(hostId)
    .then(host => {
      if (!host) {
        throw new ApiError('Host not found', undefined, 404);
      }

      const commandObj = createCommand(hostId, {
        command,
        shell: true // Use shell for PTY-like behavior
      });

      return executionService.executeCommand(host, commandObj);
    })
    .then(() => {
      res.json({
        success: true,
        message: 'Stream started'
      });
    })
    .catch(error => {
      loggerLoggingManager.getInstance().();
      next(error);
    });
}));

/**
 * Get process status
 * GET /hosts/:hostId/processes/:pid
 */
router.get('/:hostId/processes/:pid', createAuthHandler<
  ProcessParams,
  ApiResponse<ProcessInfo>,
  void,
  RequestQuery
>((req, res, next) => {
  const { hostId, pid } = req.params;

  return hostService.getHost(hostId)
    .then(host => {
      if (!host) {
        throw new ApiError('Host not found', undefined, 404);
      }

      if (!processService.isMonitored(hostId)) {
        return processService.monitor(hostId).then(() => host);
      }
      return host;
    })
    .then(() => processService.getProcessById(hostId, parseInt(pid, 10)))
    .then(process => {
      if (!process) {
        throw new ApiError('Process not found', undefined, 404);
      }

      res.json({
        success: true,
        data: process
      });
    })
    .catch(error => {
      loggerLoggingManager.getInstance().();
      next(error);
    });
}));

/**
 * List processes
 * GET /hosts/:hostId/processes
 */
router.get('/:hostId/processes', createAuthHandler<
  HostParams,
  ApiResponse<ProcessInfo[]>,
  void,
  RequestQuery
>((req, res, next) => {
  const { hostId } = req.params;

  return hostService.getHost(hostId)
    .then(host => {
      if (!host) {
        throw new ApiError('Host not found', undefined, 404);
      }

      if (!processService.isMonitored(hostId)) {
        return processService.monitor(hostId).then(() => host);
      }
      return host;
    })
    .then(() => processService.getProcesses(hostId))
    .then(processes => {
      res.json({
        success: true,
        data: processes
      });
    })
    .catch(error => {
      loggerLoggingManager.getInstance().();
      next(error);
    });
}));

/**
 * Kill process
 * POST /hosts/:hostId/processes/:pid/kill
 */
router.post('/:hostId/processes/:pid/kill', createAuthHandler<
  ProcessParams,
  ApiResponse<void>,
  KillProcessBody,
  RequestQuery
>((req, res, next) => {
  const { hostId, pid } = req.params;
  const { signal } = req.body;

  return hostService.getHost(hostId)
    .then(host => {
      if (!host) {
        throw new ApiError('Host not found', undefined, 404);
      }

      if (!processService.isMonitored(hostId)) {
        return processService.monitor(hostId).then(() => host);
      }
      return host;
    })
    .then(() => processService.killProcess(hostId, parseInt(pid, 10), signal))
    .then(() => {
      res.json({
        success: true
      });
    })
    .catch(error => {
      loggerLoggingManager.getInstance().();
      next(error);
    });
}));

export default router;


