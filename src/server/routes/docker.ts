import express from 'express';

import { createApiError } from '../../types/error';
import { createAuthHandler, type AuthenticatedRequestHandler } from '../../types/express';
import type { LogMetadata } from '../../types/logger';
import type { Container, Stack, ApiResponse } from '../../types/models-shared';
import cache from '../cache';
import { LoggingManager } from '../utils/logging/LoggingManager';

const router = express.Router();

interface DockerParams {
  hostId: string;
}

type ContainersResponse = ApiResponse<Container[]>;
type StacksResponse = ApiResponse<Stack[]>;
type EmptyResponse = ApiResponse<void>;

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
const getContainers: AuthenticatedRequestHandler<DockerParams, ContainersResponse> = async (req, res) => {
  const hostId = parseInt(req.params.hostId, 10);
  if (isNaN(hostId)) {
    const error = createApiError('Invalid host ID', null, 400);
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }

  try {
    const containers = await cache.getContainers(String(hostId));
    return res.json({
      success: true,
      data: containers || [],
    });
  } catch (error) {
    const metadata: LogMetadata = {
      hostId: String(hostId),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    LoggingManager.getInstance().error('Failed to get Docker containers:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to get Docker containers',
      error,
      500,
    );
    return res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
};

/**
 * Get Docker stacks for a host
 */
const getStacks: AuthenticatedRequestHandler<DockerParams, StacksResponse> = async (req, res) => {
  const hostId = parseInt(req.params.hostId, 10);
  if (isNaN(hostId)) {
    const error = createApiError('Invalid host ID', null, 400);
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }

  try {
    const stacks = await cache.getStacks(String(hostId));
    return res.json({
      success: true,
      data: stacks || [],
    });
  } catch (error) {
    const metadata: LogMetadata = {
      hostId: String(hostId),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    LoggingManager.getInstance().error('Failed to get Docker stacks:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to get Docker stacks',
      error,
      500,
    );
    return res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
};

/**
 * Cache Docker containers for a host
 */
const cacheContainers: AuthenticatedRequestHandler<DockerParams, EmptyResponse, Container[]> = async (req, res) => {
  const hostId = parseInt(req.params.hostId, 10);
  if (isNaN(hostId)) {
    const error = createApiError('Invalid host ID', null, 400);
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }

  if (!validateContainers(req.body)) {
    const error = createApiError('Invalid container data', req.body, 400);
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }

  try {
    await cache.setContainers(String(hostId), req.body);
    return res.json({ success: true });
  } catch (error) {
    const metadata: LogMetadata = {
      hostId: String(hostId),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    LoggingManager.getInstance().error('Failed to cache Docker containers:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to cache Docker containers',
      error,
      500,
    );
    return res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
};

/**
 * Cache Docker stacks for a host
 */
const cacheStacks: AuthenticatedRequestHandler<DockerParams, EmptyResponse, Stack[]> = async (req, res) => {
  const hostId = parseInt(req.params.hostId, 10);
  if (isNaN(hostId)) {
    const error = createApiError('Invalid host ID', null, 400);
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }

  if (!validateStacks(req.body)) {
    const error = createApiError('Invalid stack data', req.body, 400);
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }

  try {
    await cache.setStacks(String(hostId), req.body);
    return res.json({ success: true });
  } catch (error) {
    const metadata: LogMetadata = {
      hostId: String(hostId),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    LoggingManager.getInstance().error('Failed to cache Docker stacks:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to cache Docker stacks',
      error,
      500,
    );
    return res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
};

// Register routes
router.get('/:hostId/containers', createAuthHandler(getContainers));
router.get('/:hostId/stacks', createAuthHandler(getStacks));
router.post('/:hostId/containers', createAuthHandler(cacheContainers));
router.post('/:hostId/stacks', createAuthHandler(cacheStacks));

export default router;

