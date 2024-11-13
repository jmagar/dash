import express from 'express';
import type { Request as ExpressRequest, Response } from 'express-serve-static-core';

import type { CacheCommand } from '../../types/cache';
import { createApiError } from '../../types/error';
import type { LogMetadata } from '../../types/logger';
import cache from '../cache';
import { logger } from '../utils/logger';

const router = express.Router();

// Extend Request type to include user property
interface AuthenticatedRequest extends ExpressRequest {
  user?: {
    id: string;
    [key: string]: unknown;
  };
}

interface CommandRequest extends AuthenticatedRequest {
  body: {
    command: string;
    workingDirectory?: string;
  };
  params: {
    hostId: string;
  };
}

function validateCommand(command: unknown): command is { command: string; workingDirectory?: string } {
  return typeof command === 'object' &&
    command !== null &&
    typeof (command as { command: string }).command === 'string' &&
    ((command as { workingDirectory?: string }).workingDirectory === undefined ||
      typeof (command as { workingDirectory?: string }).workingDirectory === 'string');
}

/**
 * Cache a terminal command for a specific host
 */
router.post('/:hostId/command', async (req: CommandRequest, res: Response) => {
  const hostId = parseInt(req.params.hostId, 10);
  if (isNaN(hostId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid host ID',
    });
  }

  const userId = req.user?.id;
  if (!userId) {
    const error = createApiError('Unauthorized', 401);
    return res.status(error.status || 401).json({
      success: false,
      error: error.message,
    });
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

    await cache.cacheCommand(userId, String(hostId), commandData);

    logger.info('Command cached', {
      userId,
      hostId: String(hostId),
      command,
      workingDirectory,
    });

    res.json({
      success: true,
      data: null,
    });
  } catch (error) {
    const metadata: LogMetadata = {
      userId,
      hostId: String(hostId),
      command,
      workingDirectory,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to cache command:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to cache command',
      500,
      metadata,
    );
    res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
});

/**
 * Get command history for a specific host
 */
router.get('/:hostId/history', async (req: AuthenticatedRequest, res: Response) => {
  const hostId = parseInt(req.params.hostId, 10);
  if (isNaN(hostId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid host ID',
    });
  }

  const userId = req.user?.id;
  if (!userId) {
    const error = createApiError('Unauthorized', 401);
    return res.status(error.status || 401).json({
      success: false,
      error: error.message,
    });
  }

  try {
    const commands = await cache.getCommands(userId, String(hostId));
    if (!Array.isArray(commands)) {
      throw new Error('Invalid command history format');
    }

    res.json({
      success: true,
      data: commands.map(cmd => ({
        ...cmd,
        timestamp: cmd.timestamp instanceof Date ? cmd.timestamp : new Date(cmd.timestamp),
      })),
    });
  } catch (error) {
    const metadata: LogMetadata = {
      userId,
      hostId: String(hostId),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to get command history:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to get command history',
      500,
      metadata,
    );
    res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
});

export default router;
