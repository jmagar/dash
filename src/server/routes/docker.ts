import express from 'express';
import type { Request, Response } from 'express-serve-static-core';

import { createApiError } from '../../types/error';
import type { LogMetadata } from '../../types/logger';
import cache from '../cache';
import { logger } from '../utils/logger';

const router = express.Router();

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    [key: string]: unknown;
  };
}

interface DockerRequest extends AuthenticatedRequest {
  params: {
    hostId: string;
  };
}

/**
 * Get Docker containers for a host
 */
router.get('/:hostId/containers', async (req: DockerRequest, res: Response) => {
  const { hostId } = req.params;

  try {
    const containers = await cache.getDockerContainers(hostId);
    res.json({
      success: true,
      containers: containers || [],
    });
  } catch (error) {
    const metadata: LogMetadata = {
      hostId,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to get Docker containers:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to get Docker containers',
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
 * Get Docker stacks for a host
 */
router.get('/:hostId/stacks', async (req: DockerRequest, res: Response) => {
  const { hostId } = req.params;

  try {
    const stacks = await cache.getDockerStacks(hostId);
    res.json({
      success: true,
      stacks: stacks || [],
    });
  } catch (error) {
    const metadata: LogMetadata = {
      hostId,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to get Docker stacks:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to get Docker stacks',
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
 * Cache Docker containers for a host
 */
router.post('/:hostId/containers', async (req: DockerRequest, res: Response) => {
  const { hostId } = req.params;
  const containers = req.body;

  try {
    await cache.cacheDockerContainers(hostId, containers);
    res.json({ success: true });
  } catch (error) {
    const metadata: LogMetadata = {
      hostId,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to cache Docker containers:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to cache Docker containers',
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
 * Cache Docker stacks for a host
 */
router.post('/:hostId/stacks', async (req: DockerRequest, res: Response) => {
  const { hostId } = req.params;
  const stacks = req.body;

  try {
    await cache.cacheDockerStacks(hostId, stacks);
    res.json({ success: true });
  } catch (error) {
    const metadata: LogMetadata = {
      hostId,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to cache Docker stacks:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to cache Docker stacks',
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
