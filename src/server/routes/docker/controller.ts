import { Request, Response } from 'express';
import { ApiError } from '../../utils/error';
import { ApiResponse } from '../../types/express';
import { logger } from '../../utils/logger';
import cache from '../../cache';
import { Container, Stack } from '../../types/models-shared';
import { DockerParams, CacheContainersDto, CacheStacksDto } from './dto/docker.dto';
import { LoggingManager } from '../../../../../../../../../../utils/logging/LoggingManager';

function validateContainers(containers: unknown): containers is Container[] {
  return Array.isArray(containers) && containers.every(container =>
    typeof container === 'object' && container !== null &&
    typeof container.id === 'string' &&
    typeof container.name === 'string'
  );
}

function validateStacks(stacks: unknown): stacks is Stack[] {
  return Array.isArray(stacks) && stacks.every(stack =>
    typeof stack === 'object' && stack !== null &&
    typeof stack.id === 'string' &&
    typeof stack.name === 'string'
  );
}

export const getContainers = async (
  req: Request<DockerParams>,
  res: Response
): Promise<void> => {
  const { hostId } = req.params;
  const logMeta = { userId: req.user!.id, hostId };

  loggerLoggingManager.getInstance().();

  const containers = await cache.get(`docker:containers:${hostId}`);
  if (!containers) {
    throw new ApiError(404, 'No cached containers found');
  }

  if (!validateContainers(containers)) {
    throw new ApiError(500, 'Invalid container data in cache');
  }

  res.json(new ApiResponse(containers));
};

export const getStacks = async (
  req: Request<DockerParams>,
  res: Response
): Promise<void> => {
  const { hostId } = req.params;
  const logMeta = { userId: req.user!.id, hostId };

  loggerLoggingManager.getInstance().();

  const stacks = await cache.get(`docker:stacks:${hostId}`);
  if (!stacks) {
    throw new ApiError(404, 'No cached stacks found');
  }

  if (!validateStacks(stacks)) {
    throw new ApiError(500, 'Invalid stack data in cache');
  }

  res.json(new ApiResponse(stacks));
};

export const cacheContainers = async (
  req: Request<DockerParams, any, CacheContainersDto>,
  res: Response
): Promise<void> => {
  const { hostId } = req.params;
  const { containers } = req.body;
  const logMeta = { userId: req.user!.id, hostId };

  loggerLoggingManager.getInstance().();

  if (!validateContainers(containers)) {
    throw new ApiError(400, 'Invalid container data');
  }

  await cache.set(`docker:containers:${hostId}`, containers);
  res.json(new ApiResponse(undefined));
};

export const cacheStacks = async (
  req: Request<DockerParams, any, CacheStacksDto>,
  res: Response
): Promise<void> => {
  const { hostId } = req.params;
  const { stacks } = req.body;
  const logMeta = { userId: req.user!.id, hostId };

  loggerLoggingManager.getInstance().();

  if (!validateStacks(stacks)) {
    throw new ApiError(400, 'Invalid stack data');
  }

  await cache.set(`docker:stacks:${hostId}`, stacks);
  res.json(new ApiResponse(undefined));
};

