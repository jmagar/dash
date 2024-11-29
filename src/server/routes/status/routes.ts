import { Router } from 'express';
import { asyncAuthHandler } from '../../middleware/async';
import * as controller from './controller';
import rateLimit from 'express-rate-limit';
import { heavyOperationLimiter } from '../../middleware/rateLimit';

const router = Router();

// Get system status (protected, rate-limited)
router.get(
  '/',
  heavyOperationLimiter,
  asyncAuthHandler(controller.getStatus)
);

// Health check endpoint (public, rate-limited differently)
router.get(
  '/health',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute
    message: 'Too many health check requests'
  }),
  controller.healthCheck
);

export default router;
