import { Request, Response, Router } from 'express';

import { ApiResult, CommandResult } from '../../types/api-shared';
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
    // Check cache first
    const cachedContainers = await cache.getDockerContainers('local');
    if (cachedContainers) {
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
    res.json({ success: true, data: containers });
  } catch (err) {
    logger.error('Error listing containers:', { error: (err as Error).message, stack: (err as Error).stack });
    res.status(500).json({ success: false, error: 'Failed to list containers' });
  }
});

// Start container
router.post('/containers/:id/start', async (req: Request<{ id: string }>, res: Response<ApiResult<void>>) => {
  try {
    await executeCommand(`docker start ${req.params.id}`);
    await cache.invalidateHostCache('local');
    res.json({ success: true });
  } catch (err) {
    logger.error('Error starting container:', { error: (err as Error).message, stack: (err as Error).stack });
    res.status(500).json({ success: false, error: 'Failed to start container' });
  }
});

// Stop container
router.post('/containers/:id/stop', async (req: Request<{ id: string }>, res: Response<ApiResult<void>>) => {
  try {
    await executeCommand(`docker stop ${req.params.id}`);
    await cache.invalidateHostCache('local');
    res.json({ success: true });
  } catch (err) {
    logger.error('Error stopping container:', { error: (err as Error).message, stack: (err as Error).stack });
    res.status(500).json({ success: false, error: 'Failed to stop container' });
  }
});

// Delete container
router.delete('/containers/:id', async (req: Request<{ id: string }>, res: Response<ApiResult<void>>) => {
  try {
    await executeCommand(`docker rm -f ${req.params.id}`);
    await cache.invalidateHostCache('local');
    res.json({ success: true });
  } catch (err) {
    logger.error('Error removing container:', { error: (err as Error).message, stack: (err as Error).stack });
    res.status(500).json({ success: false, error: 'Failed to remove container' });
  }
});

// Get container logs
router.get('/containers/:id/logs', async (req: Request<{ id: string }>, res: Response<ApiResult<string>>) => {
  try {
    const result = await executeCommand(`docker logs --tail 100 --timestamps ${req.params.id}`);
    if (!result.stdout) {
      throw new Error('No output from docker command');
    }
    res.json({ success: true, data: result.stdout });
  } catch (err) {
    logger.error('Error getting container logs:', { error: (err as Error).message, stack: (err as Error).stack });
    res.status(500).json({ success: false, error: 'Failed to get container logs' });
  }
});

// Get container stats
router.get('/containers/:id/stats', async (req: Request<{ id: string }>, res: Response<ApiResult<string>>) => {
  try {
    const result = await executeCommand(`docker stats ${req.params.id} --no-stream --format "{{json .}}"`);
    if (!result.stdout) {
      throw new Error('No output from docker command');
    }
    res.json({ success: true, data: result.stdout });
  } catch (err) {
    logger.error('Error getting container stats:', { error: (err as Error).message, stack: (err as Error).stack });
    res.status(500).json({ success: false, error: 'Failed to get container stats' });
  }
});

// List stacks (docker compose)
router.get('/stacks', async (_req: Request, res: Response<ApiResult<Stack[]>>) => {
  try {
    // Check cache first
    const cachedStacks = await cache.getDockerStacks('local');
    if (cachedStacks) {
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
    res.json({ success: true, data: stacks });
  } catch (err) {
    logger.error('Error listing stacks:', { error: (err as Error).message, stack: (err as Error).stack });
    res.status(500).json({ success: false, error: 'Failed to list stacks' });
  }
});

export default router;
