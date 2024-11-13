import express from 'express';
import type { Request, Response } from 'express-serve-static-core';

import { createApiError } from '../../types/error';
import type { LogMetadata } from '../../types/logger';
import type { Container, Stack } from '../../types/models-shared';
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

function validateContainers(containers: unknown): containers is Container[] {
  return Array.isArray(containers) && containers.every(container =>
    typeof container === 'object' &&
    container !== null &&
    typeof container.id === 'string' &&
    typeof container.name === 'string' &&
    typeof container.image === 'string' &&
    typeof container.status === 'string' &&
    ['running', 'stopped', 'paused'].includes(container.state)
  );
}

function validateStacks(stacks: unknown): stacks is Stack[] {
  return Array.isArray(stacks) && stacks.every(stack =>
    typeof stack === 'object' &&
    stack !== null &&
    typeof stack.name === 'string' &&
    typeof stack.services === 'number' &&
    ['running', 'partial', 'stopped'].includes(stack.status) &&
    stack.created instanceof Date
  );
}

/**
 * Get Docker containers for a host
 */
router.get('/:hostId/containers', async (req: DockerRequest, res: Response) => {
  const hostId = parseInt(req.params.hostId, 10);
  if (isNaN(hostId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid host ID',
    });
  }

  try {
    const containers = await cache.getDockerContainers(String(hostId));
    res.json({
      success: true,
      data: containers || [],
    });
  } catch (error) {
    const metadata: LogMetadata = {
      hostId: String(hostId),
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
  const hostId = parseInt(req.params.hostId, 10);
  if (isNaN(hostId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid host ID',
    });
  }

  try {
    const stacks = await cache.getDockerStacks(String(hostId));
    res.json({
      success: true,
      data: stacks || [],
    });
  } catch (error) {
    const metadata: LogMetadata = {
      hostId: String(hostId),
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
  const hostId = parseInt(req.params.hostId, 10);
  if (isNaN(hostId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid host ID',
    });
  }

  if (!validateContainers(req.body)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid container data',
    });
  }

  try {
    await cache.cacheDockerContainers(String(hostId), req.body);
    res.json({ success: true });
  } catch (error) {
    const metadata: LogMetadata = {
      hostId: String(hostId),
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
  const hostId = parseInt(req.params.hostId, 10);
  if (isNaN(hostId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid host ID',
    });
  }

  if (!validateStacks(req.body)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid stack data',
    });
  }

  try {
    await cache.cacheDockerStacks(String(hostId), req.body);
    res.json({ success: true });
  } catch (error) {
    const metadata: LogMetadata = {
      hostId: String(hostId),
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
