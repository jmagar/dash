import express, { Request, Response, NextFunction, Router } from 'express';

import authRoutes from './auth';
import dockerRoutes from './docker';
import filesRoutes from './files';
import hostsRoutes from './hosts';
import packagesRoutes from './packages';
import { serverLogger as logger } from '../../utils/serverLogger';

const router: Router = express.Router();

// Health check route
router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/docker', dockerRoutes);
router.use('/files', filesRoutes);
router.use('/hosts', hostsRoutes);
router.use('/packages', packagesRoutes);

// Error handling for routes
router.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error('Route error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
