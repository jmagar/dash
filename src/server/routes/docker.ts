import { Request, Response, Router } from 'express';

import { ApiResult, CommandResult } from '../../types/api-shared';
import { handleApiError } from '../../types/error';
import { Container, Stack } from '../../types/models-shared';
import { serverLogger as logger } from '../../utils/serverLogger';
import cache from '../cache';

const router: Router = Router();

interface DockerContainerJson {
  ID: string;
  Names: string;
  Image: string;
  Status: string;
  State: string;
  CreatedAt: string;
  Ports: string;
}

interface DockerStackJson {
  Name: string;
  Services: string;
  Status: string;
  Created: string;
}

// Execute command helper
const executeCommand = async (command: string): Promise<CommandResult> => {
  // This is a placeholder. In a real implementation, this would use SSH or some other method
  // to execute commands on the remote host.
  throw new Error('Not implemented');
};

// Get all containers
router.get('/containers', async (_req: Request, res: Response<ApiResult<Container[]>>) => {
  try {
    logger.info('Fetching docker containers');

    // Check cache first
    const cachedContainers = await cache.getDockerContainers('local');
    if (cachedContainers) {
      logger.info('Returning cached containers', { count: cachedContainers.length });
      return res.json({ success: true, data: cachedContainers });
    }

    // Get fresh data from Docker
    const result = await executeCommand('docker ps -a --format "{{json .}}"');
    if (!result.stdout) {
      throw new Error('No output from docker command');
    }

    const containers: Container[] = result.stdout.split('\n')
      .filter(Boolean)
      .map((line: string) => {
        const container: DockerContainerJson = JSON.parse(line);
        return {
          id: container.ID,
          name: container.Names,
          image: container.Image,
          status: container.Status,
          state: container.State.toLowerCase() as Container['state'],
          created: new Date(container.CreatedAt),
          ports: container.Ports ? container.Ports.split(', ') : [],
        };
      });

    // Cache the results
    await cache.cacheDockerContainers('local', containers);
    logger.info('Docker containers fetched successfully', { count: containers.length });
    res.json({ success: true, data: containers });
  } catch (error) {
    const errorResult = handleApiError<Container[]>(error, 'listContainers');
    res.status(500).json(errorResult);
  }
});

// Start container
router.post('/containers/:id/start', async (req: Request<{ id: string }>, res: Response<ApiResult<void>>) => {
  try {
    const { id } = req.params;
    logger.info('Starting docker container', { containerId: id });
    await executeCommand(`docker start ${id}`);
    await cache.invalidateHostCache('local');
    logger.info('Docker container started successfully', { containerId: id });
    res.json({ success: true });
  } catch (error) {
    const errorResult = handleApiError<void>(error, 'startContainer');
    res.status(500).json(errorResult);
  }
});

// Stop container
router.post('/containers/:id/stop', async (req: Request<{ id: string }>, res: Response<ApiResult<void>>) => {
  try {
    const { id } = req.params;
    logger.info('Stopping docker container', { containerId: id });
    await executeCommand(`docker stop ${id}`);
    await cache.invalidateHostCache('local');
    logger.info('Docker container stopped successfully', { containerId: id });
    res.json({ success: true });
  } catch (error) {
    const errorResult = handleApiError<void>(error, 'stopContainer');
    res.status(500).json(errorResult);
  }
});

// Delete container
router.delete('/containers/:id', async (req: Request<{ id: string }>, res: Response<ApiResult<void>>) => {
  try {
    const { id } = req.params;
    logger.info('Removing docker container', { containerId: id });
    await executeCommand(`docker rm -f ${id}`);
    await cache.invalidateHostCache('local');
    logger.info('Docker container removed successfully', { containerId: id });
    res.json({ success: true });
  } catch (error) {
    const errorResult = handleApiError<void>(error, 'removeContainer');
    res.status(500).json(errorResult);
  }
});

// Get container logs
router.get('/containers/:id/logs', async (req: Request<{ id: string }>, res: Response<ApiResult<string>>) => {
  try {
    const { id } = req.params;
    logger.info('Fetching docker container logs', { containerId: id });
    const result = await executeCommand(`docker logs --tail 100 --timestamps ${id}`);
    if (!result.stdout) {
      throw new Error('No output from docker command');
    }
    logger.info('Docker container logs fetched successfully', { containerId: id });
    res.json({ success: true, data: result.stdout });
  } catch (error) {
    const errorResult = handleApiError<string>(error, 'getContainerLogs');
    res.status(500).json(errorResult);
  }
});

// Get container stats
router.get('/containers/:id/stats', async (req: Request<{ id: string }>, res: Response<ApiResult<string>>) => {
  try {
    const { id } = req.params;
    logger.info('Fetching docker container stats', { containerId: id });
    const result = await executeCommand(`docker stats ${id} --no-stream --format "{{json .}}"`);
    if (!result.stdout) {
      throw new Error('No output from docker command');
    }
    logger.info('Docker container stats fetched successfully', { containerId: id });
    res.json({ success: true, data: result.stdout });
  } catch (error) {
    const errorResult = handleApiError<string>(error, 'getContainerStats');
    res.status(500).json(errorResult);
  }
});

// List stacks (docker compose)
router.get('/stacks', async (_req: Request, res: Response<ApiResult<Stack[]>>) => {
  try {
    logger.info('Fetching docker stacks');

    // Check cache first
    const cachedStacks = await cache.getDockerStacks('local');
    if (cachedStacks) {
      logger.info('Returning cached stacks', { count: cachedStacks.length });
      return res.json({ success: true, data: cachedStacks });
    }

    const result = await executeCommand('docker compose ls --format json');
    if (!result.stdout) {
      throw new Error('No output from docker command');
    }

    const stacks: Stack[] = result.stdout.split('\n')
      .filter(Boolean)
      .map((line: string) => {
        const stack: DockerStackJson = JSON.parse(line);
        return {
          name: stack.Name,
          services: stack.Services,
          status: stack.Status,
          created: new Date(stack.Created),
        };
      });

    await cache.cacheDockerStacks('local', stacks);
    logger.info('Docker stacks fetched successfully', { count: stacks.length });
    res.json({ success: true, data: stacks });
  } catch (error) {
    const errorResult = handleApiError<Stack[]>(error, 'listStacks');
    res.status(500).json(errorResult);
  }
});

export default router;
