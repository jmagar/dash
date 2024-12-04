import express from 'express';

import type { CacheCommand } from '../../types/cache';
import { ApiError } from '../../types/error';
import { createAuthHandler, type AuthenticatedRequestHandler } from '../../types/express';
import type { LogMetadata } from '../../types/logger';
import type { ApiResponse } from '../../types/models-shared';
import cache from '../cache';
import { LoggingManager } from '../managers/utils/LoggingManager';

const router = express.Router();

interface TerminalParams {
  hostId: string;
}

interface CommandBody {
  command: string;
  workingDirectory?: string;
}

type CommandResponse = ApiResponse<null>;
type HistoryResponse = ApiResponse<CacheCommand[]>;

function validateCommand(command: unknown): command is CommandBody {
  return typeof command === 'object' &&
    command !== null &&
    typeof (command as { command: string }).command === 'string' &&
    ((command as { workingDirectory?: string }).workingDirectory === undefined ||
      typeof (command as { workingDirectory?: string }).workingDirectory === 'string');
}

/**
 * Cache a terminal command for a specific host
 */
const cacheCommand: AuthenticatedRequestHandler<TerminalParams, CommandResponse, CommandBody> = async (req, res) => {
  const hostId = parseInt(req.params.hostId, 10);
  if (isNaN(hostId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid host ID',
    });
  }

  if (!req.user) {
    throw new ApiError('Authentication required', undefined, 401);
  }

  if (!validateCommand(req.body)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid command format',
    });
  }

  const { command, workingDirectory } = req.body;
  if (!command.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Command cannot be empty',
    });
  }

  try {
    const commandData: CacheCommand = {
      command,
      workingDirectory,
      timestamp: new Date(),
    };

    const commandId = String(hostId);
    await cache.setCommand(commandId, JSON.stringify(commandData));

    LoggingManager.getInstance().info('Command cached', {
      userId: req.user.id,
      hostId: String(hostId),
      command,
      workingDirectory,
    });

    return res.json({
      success: true,
      data: null,
    });
  } catch (error) {
    const metadata: LogMetadata = {
      userId: req.user?.id,
      hostId: String(hostId),
      command,
      workingDirectory,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    LoggingManager.getInstance().error('Failed to cache command:', metadata);

    const apiError = new ApiError(
      error instanceof Error ? error.message : 'Failed to cache command',
      undefined,
      500,
      metadata
    );
    return res.status(apiError.status).json({
      success: false,
      error: apiError.message,
    });
  }
};

/**
 * Get command history for a specific host
 */
const getCommandHistory: AuthenticatedRequestHandler<TerminalParams, HistoryResponse> = async (req, res) => {
  const hostId = parseInt(req.params.hostId, 10);
  if (isNaN(hostId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid host ID',
    });
  }

  if (!req.user) {
    throw new ApiError('Authentication required', undefined, 401);
  }

  try {
    const commandId = String(hostId);
    const commandData = await cache.getCommand(commandId);
    if (!commandData) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const commands = JSON.parse(commandData);
    if (!Array.isArray(commands)) {
      throw new Error('Invalid command history format');
    }

    return res.json({
      success: true,
      data: commands,
    });
  } catch (error) {
    const metadata: LogMetadata = {
      userId: req.user?.id,
      hostId: String(hostId),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    LoggingManager.getInstance().error('Failed to get command history:', metadata);

    const apiError = new ApiError(
      error instanceof Error ? error.message : 'Failed to get command history',
      undefined,
      500,
      metadata
    );
    return res.status(apiError.status).json({
      success: false,
      error: apiError.message,
    });
  }
};

// Register routes
router.post('/:hostId/command', createAuthHandler(cacheCommand));
router.get('/:hostId/history', createAuthHandler(getCommandHistory));

export default router;


