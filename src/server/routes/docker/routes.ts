import { Router } from 'express';
import { asyncAuthHandler } from '../../middleware/async';
import * as controller from './controller';
import { DockerParams, CacheContainersDto, CacheStacksDto } from './dto/docker.dto';

const router = Router();

// Get Docker containers for a host
router.get(
  '/:hostId/containers',
  asyncAuthHandler<DockerParams>(controller.getContainers)
);

// Get Docker stacks for a host
router.get(
  '/:hostId/stacks',
  asyncAuthHandler<DockerParams>(controller.getStacks)
);

// Cache Docker containers for a host
router.post(
  '/:hostId/containers',
  asyncAuthHandler<DockerParams, any, CacheContainersDto>(controller.cacheContainers)
);

// Cache Docker stacks for a host
router.post(
  '/:hostId/stacks',
  asyncAuthHandler<DockerParams, any, CacheStacksDto>(controller.cacheStacks)
);

export default router;
