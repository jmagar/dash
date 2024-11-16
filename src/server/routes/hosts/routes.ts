import { Router } from 'express';
import { createAuthHandler } from '../../../types/express';
import * as controller from './controller';

const router = Router();

// List all hosts
router.get('/', createAuthHandler(controller.listHosts));

// Get host by ID
router.get('/:id', createAuthHandler(controller.getHost));

// Create new host
router.post('/', createAuthHandler(controller.createHost));

// Update host
router.put('/:id', createAuthHandler(controller.updateHost));

// Delete host
router.delete('/:id', createAuthHandler(controller.deleteHost));

// Test connection without creating host
router.post('/:id/test', createAuthHandler(controller.testConnection));

export default router;
