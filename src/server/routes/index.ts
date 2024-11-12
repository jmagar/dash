import { Request, Response, NextFunction, Router } from 'express';

import authRoutes from './auth';
import dockerRoutes from './docker';
import filesRoutes from './files';
import hostsRoutes from './hosts';
import packagesRoutes from './packages';
import { authenticateToken } from '../middleware/auth';
import { serverLogger as logger } from '../utils/serverLogger';

const router: Router = Router();

interface HealthResponse {
  status: string;
}

interface ErrorResponse {
  success: boolean;
  error: string;
}

// Health check route
router.get('/health', (_req: Request, res: Response<HealthResponse>) => {
  res.json({ status: 'ok' });
});

// Mount auth routes before authentication middleware
router.use('/auth', authRoutes);

// Apply authentication middleware to protected routes unless auth is disabled
if (process.env.DISABLE_AUTH !== 'true') {
  router.use((req: Request, res: Response, next: NextFunction) => {
    // Skip authentication for auth-related endpoints
    if (req.path.startsWith('/auth/')) {
      return next();
    }
    authenticateToken(req, res, next);
  });
}

// Mount other protected routes
router.use('/docker', dockerRoutes);
router.use('/files', filesRoutes);
router.use('/hosts', hostsRoutes);
router.use('/packages', packagesRoutes);

// Error handling for routes
router.use((err: Error, req: Request, res: Response<ErrorResponse>, _next: NextFunction) => {
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
