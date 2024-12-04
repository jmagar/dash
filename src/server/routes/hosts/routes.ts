import { createRouter, logRouteAccess } from '../routeUtils';
import { Router } from 'express';
import type { CreateHostRequest, UpdateHostRequest } from '../../../types/models-shared';
import { asyncAuthHandler } from '../../middleware/async';
import * as controller from './controller';
import type { HostIdParam, HostData, HostListData, HostStatsData } from './controller';

const router = Router();

// List all hosts
router.get('/', asyncAuthHandler<Record<string, never>, HostListData>(
  controller.listHosts
));

// Get host by ID
router.get('/:id', asyncAuthHandler<HostIdParam, HostData>(
  controller.getHost
));

// Create new host
router.post('/', asyncAuthHandler<Record<string, never>, HostData, CreateHostRequest>(
  controller.createHost
));

// Update host
router.put('/:id', asyncAuthHandler<HostIdParam, HostData, UpdateHostRequest>(
  controller.updateHost
));

// Delete host
router.delete('/:id', asyncAuthHandler<HostIdParam, void>(
  controller.deleteHost
));

// Test connection without creating host
router.post('/:id/test', asyncAuthHandler<HostIdParam, void>(
  controller.testConnection
));

// Get host stats
router.get('/:id/stats', asyncAuthHandler<HostIdParam, HostStatsData>(
  controller.getHostStats
));

// Get host status
router.get('/:id/status', asyncAuthHandler<HostIdParam, HostData>(
  controller.getHostStatus
));

// Connect to host
router.post('/:id/connect', asyncAuthHandler<HostIdParam, void>(
  controller.connectHost
));

// Disconnect from host
router.post('/:id/disconnect', asyncAuthHandler<HostIdParam, void>(
  controller.disconnectHost
));

export default router;
