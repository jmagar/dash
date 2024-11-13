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
  };
  params: {
    hostId: string;
  };
}

/**
 * Cache a terminal command for a specific host
 */
router.post('/:hostId/command', async (req: CommandRequest, res: Response) => {
  const { hostId } = req.params;
  const { command } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    const error = createApiError('Unauthorized', 401);
    return res.status(error.status || 401).json({
      success: false,
      error: error.message,
    });
  }

  try {
    const commandData: CacheCommand = {
      command,
      timestamp: new Date(),
    };

    await cache.cacheCommand(userId, hostId, commandData);

    logger.info('Command cached', {
      userId,
      hostId,
      command,
    });

    res.json({ success: true });
  } catch (error) {
    const metadata: LogMetadata = {
      userId,
      hostId,
      command,
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
  const { hostId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    const error = createApiError('Unauthorized', 401);
    return res.status(error.status || 401).json({
      success: false,
      error: error.message,
    });
  }

  try {
    const commands = await cache.getCommands(userId, hostId);
    res.json({
      success: true,
      commands: commands || [],
    });
  } catch (error) {
    const metadata: LogMetadata = {
      userId,
      hostId,
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
