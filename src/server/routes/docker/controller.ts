import { Request, Response } from 'express';
import { ApiError, ApiResponse } from '../../../types/api-error';
import { DockerContainer, isDockerContainer } from '../../../types/docker.types';
import { LoggingManager } from '../../managers/LoggingManager';
import cache from '../../cache';

// Docker route parameter types
export interface DockerParams {
  hostId: string;
}

// Stack type definition
export interface DockerStack {
  id: string;
  name: string;
  services: DockerContainer[];
}

// DTO types
export interface CacheContainersDto {
  containers: DockerContainer[];
}

export interface CacheStacksDto {
  stacks: DockerStack[];
}

function validateContainers(containers: unknown): containers is DockerContainer[] {
  if (!Array.isArray(containers)) return false;
  return containers.every((container): container is DockerContainer => isDockerContainer(container));
}

function validateStacks(stacks: unknown): stacks is DockerStack[] {
  if (!Array.isArray(stacks)) return false;
  return stacks.every((stack): stack is DockerStack => {
    if (!stack || typeof stack !== 'object') return false;
    const typedStack = stack as Partial<DockerStack>;
    return typeof typedStack.id === 'string' &&
           typeof typedStack.name === 'string' &&
           Array.isArray(typedStack.services) &&
           typedStack.services.every((service): service is DockerContainer => isDockerContainer(service));
  });
}

export const getContainers = async (
  req: Request<DockerParams>,
  res: Response
): Promise<void> => {
  const { hostId } = req.params;
  const logMeta = { userId: req.user?.id, hostId };
  const logger = LoggingManager.getInstance();

  logger.info('Getting containers from cache', logMeta);

  const containers = await cache.get<DockerContainer[]>(`docker:containers:${hostId}`);
  if (!containers) {
    throw new ApiError('No cached containers found', 404);
  }

  if (!validateContainers(containers)) {
    throw new ApiError('Invalid container data in cache', 500);
  }

  const response: ApiResponse<DockerContainer[]> = {
    success: true,
    data: containers
  };
  res.json(response);
};

export const getStacks = async (
  req: Request<DockerParams>,
  res: Response
): Promise<void> => {
  const { hostId } = req.params;
  const logMeta = { userId: req.user?.id, hostId };
  const logger = LoggingManager.getInstance();

  logger.info('Getting stacks from cache', logMeta);

  const stacks = await cache.get<DockerStack[]>(`docker:stacks:${hostId}`);
  if (!stacks) {
    throw new ApiError('No cached stacks found', 404);
  }

  if (!validateStacks(stacks)) {
    throw new ApiError('Invalid stack data in cache', 500);
  }

  const response: ApiResponse<DockerStack[]> = {
    success: true,
    data: stacks
  };
  res.json(response);
};

export const cacheContainers = async (
  req: Request<DockerParams, unknown, CacheContainersDto>,
  res: Response
): Promise<void> => {
  const { hostId } = req.params;
  const { containers } = req.body;
  const logMeta = { userId: req.user?.id, hostId };
  const logger = LoggingManager.getInstance();

  logger.info('Caching containers', logMeta);

  if (!validateContainers(containers)) {
    throw new ApiError('Invalid container data', 400);
  }

  await cache.set(`docker:containers:${hostId}`, containers);
  const response: ApiResponse = { success: true };
  res.json(response);
};

export const cacheStacks = async (
  req: Request<DockerParams, unknown, CacheStacksDto>,
  res: Response
): Promise<void> => {
  const { hostId } = req.params;
  const { stacks } = req.body;
  const logMeta = { userId: req.user?.id, hostId };
  const logger = LoggingManager.getInstance();

  logger.info('Caching stacks', logMeta);

  if (!validateStacks(stacks)) {
    throw new ApiError('Invalid stack data', 400);
  }

  await cache.set(`docker:stacks:${hostId}`, stacks);
  const response: ApiResponse = { success: true };
  res.json(response);
};
