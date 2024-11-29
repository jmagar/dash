import { Router } from 'express';
import { asyncAuthHandler } from '../../middleware/async';
import * as controller from './controller';

const router = Router();

// Test route
router.get(
  '/',
  asyncAuthHandler(controller.testRoute)
);

export default router;
