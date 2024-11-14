import { Router } from 'express';
import { checkRole } from '../../middleware/auth';
import { validateHostId, validateCreateHostRequest, validateUpdateHostRequest } from '../../middleware/validation';
import { createHost, deleteHost, getHost, listHosts, updateHost, testConnection } from './controller';

const router = Router();

// List all hosts
router.get('/', checkRole('admin'), listHosts);

// Get host by ID
router.get('/:id', checkRole('admin'), validateHostId, getHost);

// Create new host
router.post('/', checkRole('admin'), validateCreateHostRequest, createHost);

// Update host
router.put('/:id', checkRole('admin'), validateHostId, validateUpdateHostRequest, updateHost);

// Delete host
router.delete('/:id', checkRole('admin'), validateHostId, deleteHost);

// Test connection without creating host
router.post('/test-connection', checkRole('admin'), validateCreateHostRequest, testConnection);

export default router;
