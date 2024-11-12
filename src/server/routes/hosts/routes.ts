import { Router, Request, Response, NextFunction } from 'express';

import * as hostController from './controller';
import { createAuthHandler } from '../../../types/express';
import { checkRole } from '../../middleware/auth';

const router: Router = Router();

// List hosts
router.get('/', hostController.listHosts);

// Get host details
router.get('/:id', hostController.getHost);

// Test connection without creating host
router.post(
  '/test-connection',
  createAuthHandler(hostController.testConnection),
);

// Create host
router.post(
  '/',
  process.env.DISABLE_AUTH !== 'true' ? checkRole(['admin']) : (_req: Request, _res: Response, next: NextFunction): void => next(),
  createAuthHandler(hostController.createHost),
);

// Update host
router.patch(
  '/:id',
  process.env.DISABLE_AUTH !== 'true' ? checkRole(['admin']) : (_req: Request, _res: Response, next: NextFunction): void => next(),
  createAuthHandler(hostController.updateHost),
);

// Delete host
router.delete(
  '/:id',
  process.env.DISABLE_AUTH !== 'true' ? checkRole(['admin']) : (_req: Request, _res: Response, next: NextFunction): void => next(),
  createAuthHandler(hostController.deleteHost),
);

// Test existing host connection
router.post(
  '/:id/test',
  createAuthHandler(hostController.testHost),
);

export default router;
