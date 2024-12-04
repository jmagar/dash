import { z } from 'zod';
import { createRouter, createRouteHandler } from '../../utils/routeUtils';
import { hostsService } from '../../services/hosts.service';
import { requireAuth } from '../../middleware/auth';
import { ApiError } from '../../../types/error';

// Validation schemas
const hostIdParamSchema = z.object({
  params: z.object({
    hostId: z.string()
  })
});

const createHostSchema = z.object({
  body: z.object({
    name: z.string(),
    address: z.string(),
    port: z.number().optional(),
    username: z.string(),
    password: z.string().optional(),
    privateKey: z.string().optional(),
    type: z.enum(['ssh', 'sftp', 'ftp']),
    tags: z.array(z.string()).optional()
  })
});

const updateHostSchema = z.object({
  params: z.object({
    hostId: z.string()
  }),
  body: z.object({
    name: z.string().optional(),
    address: z.string().optional(),
    port: z.number().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    privateKey: z.string().optional(),
    type: z.enum(['ssh', 'sftp', 'ftp']).optional(),
    tags: z.array(z.string()).optional()
  })
});

export const router = createRouter();

// Apply authentication to all host routes
router.use(requireAuth);

// List all hosts
router.get('/', createRouteHandler(
  async (req) => await hostsService.listHosts(req.user.id),
  { requireAuth: true }
));

// Get host by ID
router.get('/:hostId', createRouteHandler(
  async (req) => {
    const { hostId } = req.params;
    const host = await hostsService.getHost(req.user.id, hostId);
    if (!host) {
      throw new ApiError('Host not found', 404);
    }
    return host;
  },
  {
    requireAuth: true,
    schema: hostIdParamSchema
  }
));

// Create new host
router.post('/', createRouteHandler(
  async (req) => {
    const hostData = req.body;
    return await hostsService.createHost(req.user.id, hostData);
  },
  {
    requireAuth: true,
    schema: createHostSchema
  }
));

// Update host
router.put('/:hostId', createRouteHandler(
  async (req) => {
    const { hostId } = req.params;
    const updateData = req.body;
    return await hostsService.updateHost(req.user.id, hostId, updateData);
  },
  {
    requireAuth: true,
    schema: updateHostSchema
  }
));

// Delete host
router.delete('/:hostId', createRouteHandler(
  async (req) => {
    const { hostId } = req.params;
    await hostsService.deleteHost(req.user.id, hostId);
    return { message: 'Host deleted successfully' };
  },
  {
    requireAuth: true,
    schema: hostIdParamSchema
  }
));

// Test connection
router.post('/:hostId/test', createRouteHandler(
  async (req) => {
    const { hostId } = req.params;
    const result = await hostsService.testConnection(req.user.id, hostId);
    return { success: result };
  },
  {
    requireAuth: true,
    schema: hostIdParamSchema
  }
));

// Get host stats
router.get('/:hostId/stats', createRouteHandler(
  async (req) => {
    const { hostId } = req.params;
    const stats = await hostsService.getHostStats(req.user.id, hostId);
    return stats;
  },
  {
    requireAuth: true,
    schema: hostIdParamSchema
  }
));

// Get host status
router.get('/:hostId/status', createRouteHandler(
  async (req) => {
    const { hostId } = req.params;
    const status = await hostsService.getHostStatus(req.user.id, hostId);
    return status;
  },
  {
    requireAuth: true,
    schema: hostIdParamSchema
  }
));

// Connect to host
router.post('/:hostId/connect', createRouteHandler(
  async (req) => {
    const { hostId } = req.params;
    await hostsService.connectHost(req.user.id, hostId);
    return { message: 'Host connected successfully' };
  },
  {
    requireAuth: true,
    schema: hostIdParamSchema
  }
));

// Disconnect from host
router.post('/:hostId/disconnect', createRouteHandler(
  async (req) => {
    const { hostId } = req.params;
    await hostsService.disconnectHost(req.user.id, hostId);
    return { message: 'Host disconnected successfully' };
  },
  {
    requireAuth: true,
    schema: hostIdParamSchema
  }
));
