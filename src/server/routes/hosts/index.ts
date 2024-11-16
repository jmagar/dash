import { Router } from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { HostParams } from './controller';
import { validateHostId, validateCreateHostRequest, validateUpdateHostRequest } from '../../middleware/validation';
import { requireAuth } from '../../middleware/auth';
import * as hostController from './controller';
import { getConnection, closeConnection } from './pool';

// Host connection constants
export const CONNECTION_TIMEOUT = 20000; // 20 seconds
export const KEEP_ALIVE_INTERVAL = 10000; // 10 seconds
export const KEEP_ALIVE_COUNT_MAX = 3;

const router = Router();

// Apply authentication middleware
router.use(requireAuth);

// Helper function to wrap async handlers with proper typing
const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return async (req, res, next) => {
    try {
      await Promise.resolve(fn(req, res, next));
    } catch (error) {
      next(error);
    }
  };
};

// Host management routes
router.get('/', asyncHandler(hostController.listHosts as unknown as RequestHandler));
router.get('/:id', validateHostId, asyncHandler(hostController.getHost as unknown as RequestHandler));
router.post('/', validateCreateHostRequest, asyncHandler(hostController.createHost as unknown as RequestHandler));
router.put('/:id', validateHostId, validateUpdateHostRequest, asyncHandler(hostController.updateHost as unknown as RequestHandler));
router.delete('/:id', validateHostId, asyncHandler(hostController.deleteHost as unknown as RequestHandler));

// Host connection testing
router.post('/:id/test', validateHostId, asyncHandler(hostController.testConnection as unknown as RequestHandler));

// Export routes
export default router;

// Export host utilities
export {
  getConnection,
  closeConnection,
};
