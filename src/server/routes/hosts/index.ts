import { Router } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { AuthenticatedRequest, ApiResponse, Response } from '../../../types/express';
import type { Host, CreateHostRequest, UpdateHostRequest } from '../../../types/models-shared';
import { ApiError } from '../../../types/error';
import { LoggingManager } from '../../managers/LoggingManager';
import { sshService } from '../../services/ssh.service';
import { AgentInstaller } from '../../services/agent-installer';
import { LinuxHandler } from '../../services/agent-installer/linux-handler';
import { WindowsHandler } from '../../services/agent-installer/windows-handler';
import { getAgentService } from '../../services/agent.service';
import { db } from '../../db';
import { asyncAuthHandler } from '../../middleware/async';

const router: Router = Router();
const logger = LoggingManager.getInstance();
const agentInstaller = new AgentInstaller(
  new LinuxHandler(sshService),
  new WindowsHandler(sshService)
);

interface HostParams extends ParamsDictionary {
  id: string;
}

type HostResponse = ApiResponse<Host>;
type HostListResponse = ApiResponse<Host[]>;

type ExtendedHost = Host & {
  metadata: NonNullable<Host['metadata']> & {
    agentConnected: boolean;
    agentMetrics?: Record<string, unknown>;
  };
};

/**
 * List all hosts
 * GET /hosts
 */
const listHosts = async (
  req: AuthenticatedRequest,
  res: Response<HostListResponse>
): Promise<void> => {
  if (!req.user) {
    throw new ApiError('Authentication required', undefined, 401);
  }

  const result = await db.query<Host>(
    'SELECT *, agent_status as "agentStatus" FROM hosts WHERE user_id = $1 ORDER BY created_at DESC',
    [req.user.userId]
  );

  const agentService = getAgentService();

  // Enrich with agent status
  const hosts = result.rows.map(host => ({
    ...host,
    metadata: {
      ...host.metadata,
      agentConnected: agentService.isConnected(host.id),
      agentMetrics: agentService.getAgentMetrics(host.id)
    }
  } as ExtendedHost));

  res.json({
    success: true,
    data: hosts,
  });
};

/**
 * Get host by ID
 * GET /hosts/:id
 */
const getHost = async (
  req: AuthenticatedRequest<HostParams>,
  res: Response<HostResponse>
): Promise<void> => {
  if (!req.user) {
    throw new ApiError('Authentication required', undefined, 401);
  }

  const result = await db.query<Host>(
    'SELECT *, agent_status as "agentStatus" FROM hosts WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.userId]
  );

  if (result.rows.length === 0) {
    throw new ApiError('Host not found', undefined, 404);
  }

  const host = result.rows[0];
  if (!host) {
    throw new ApiError('Host not found', undefined, 404);
  }

  const agentService = getAgentService();

  // Enrich with agent status
  const enrichedHost: ExtendedHost = {
    ...host,
    metadata: {
      ...host.metadata,
      agentConnected: agentService.isConnected(host.id),
      agentMetrics: agentService.getAgentMetrics(host.id)
    }
  };

  res.json({
    success: true,
    data: enrichedHost,
  });
};

/**
 * Create new host
 * POST /hosts
 */
const createHost = async (
  req: AuthenticatedRequest<ParamsDictionary, HostResponse, CreateHostRequest>,
  res: Response<HostResponse>
): Promise<void> => {
  if (!req.user) {
    throw new ApiError('Authentication required', undefined, 401);
  }

  const result = await db.query<Host>(
    `INSERT INTO hosts (
      user_id, name, hostname, port, username, password,
      status, agent_status, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    RETURNING *, agent_status as "agentStatus"`,
    [
      req.user.userId,
      req.body.name,
      req.body.hostname,
      req.body.port,
      req.body.username,
      req.body.password,
      'offline',
      null,
    ]
  );

  const host = result.rows[0];
  if (!host) {
    throw new ApiError('Failed to create host', undefined, 500);
  }

  // Install agent if requested
  if (req.body.install_agent) {
    try {
      await agentInstaller.installAgent(host, {
        installInContainer: false,
        labels: {
          created_by: req.user.userId,
          environment: req.body.environment || 'production',
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to install agent', {
        error: errorMessage,
        userId: req.user.userId,
        hostId: host.id
      });
      // Continue since host was created successfully
    }
  }

  res.status(201).json({
    success: true,
    data: host,
  });
};

/**
 * Update host
 * PUT /hosts/:id
 */
const updateHost = async (
  req: AuthenticatedRequest<HostParams, HostResponse, UpdateHostRequest>,
  res: Response<HostResponse>
): Promise<void> => {
  if (!req.user) {
    throw new ApiError('Authentication required', undefined, 401);
  }

  const result = await db.query<Host>(
    `UPDATE hosts SET
      name = COALESCE($1, name),
      hostname = COALESCE($2, hostname),
      port = COALESCE($3, port),
      username = COALESCE($4, username),
      password = COALESCE($5, password),
      updated_at = NOW()
    WHERE id = $6 AND user_id = $7
    RETURNING *, agent_status as "agentStatus"`,
    [
      req.body.name,
      req.body.hostname,
      req.body.port,
      req.body.username,
      req.body.password,
      req.params.id,
      req.user.userId,
    ]
  );

  if (result.rows.length === 0) {
    throw new ApiError('Host not found', undefined, 404);
  }

  const host = result.rows[0];
  if (!host) {
    throw new ApiError('Failed to update host', undefined, 500);
  }

  res.json({
    success: true,
    data: host,
  });
};

/**
 * Delete host
 * DELETE /hosts/:id
 */
const deleteHost = async (
  req: AuthenticatedRequest<HostParams>,
  res: Response<ApiResponse>
): Promise<void> => {
  if (!req.user) {
    throw new ApiError('Authentication required', undefined, 401);
  }

  // Get host first to check ownership
  const hostResult = await db.query<Host>(
    'SELECT *, agent_status as "agentStatus" FROM hosts WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.userId]
  );

  if (hostResult.rows.length === 0) {
    throw new ApiError('Host not found', undefined, 404);
  }

  const host = hostResult.rows[0];
  if (!host) {
    throw new ApiError('Host not found', undefined, 404);
  }

  // Uninstall agent if installed
  if (host.agentStatus === 'installed') {
    try {
      await agentInstaller.uninstallAgent(host);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to uninstall agent', {
        error: errorMessage,
        userId: req.user.userId,
        hostId: host.id
      });
      // Continue with deletion
    }
  }

  // Delete host
  await db.query(
    'DELETE FROM hosts WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.userId]
  );

  res.json({
    success: true,
  });
};

/**
 * Install agent on host
 * POST /hosts/:id/agent/install
 */
const installAgent = async (
  req: AuthenticatedRequest<HostParams>,
  res: Response<ApiResponse>
): Promise<void> => {
  if (!req.user) {
    throw new ApiError('Authentication required', undefined, 401);
  }

  const result = await db.query<Host>(
    'SELECT *, agent_status as "agentStatus" FROM hosts WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.userId]
  );

  if (result.rows.length === 0) {
    throw new ApiError('Host not found', undefined, 404);
  }

  const host = result.rows[0];
  if (!host) {
    throw new ApiError('Host not found', undefined, 404);
  }

  await agentInstaller.installAgent(host, {
    installInContainer: false,
    labels: {
      installed_by: req.user.userId,
      environment: host.environment || 'production',
    },
  });

  res.json({
    success: true,
    message: 'Agent installed successfully',
  });
};

/**
 * Uninstall agent from host
 * POST /hosts/:id/agent/uninstall
 */
const uninstallAgent = async (
  req: AuthenticatedRequest<HostParams>,
  res: Response<ApiResponse>
): Promise<void> => {
  if (!req.user) {
    throw new ApiError('Authentication required', undefined, 401);
  }

  const result = await db.query<Host>(
    'SELECT *, agent_status as "agentStatus" FROM hosts WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.userId]
  );

  if (result.rows.length === 0) {
    throw new ApiError('Host not found', undefined, 404);
  }

  const host = result.rows[0];
  if (!host) {
    throw new ApiError('Host not found', undefined, 404);
  }

  await agentInstaller.uninstallAgent(host);

  res.json({
    success: true,
    message: 'Agent uninstalled successfully',
  });
};

// Register routes
router.get('/', asyncAuthHandler(listHosts));
router.get('/:id', asyncAuthHandler(getHost));
router.post('/', asyncAuthHandler(createHost));
router.put('/:id', asyncAuthHandler(updateHost));
router.delete('/:id', asyncAuthHandler(deleteHost));
router.post('/:id/agent/install', asyncAuthHandler(installAgent));
router.post('/:id/agent/uninstall', asyncAuthHandler(uninstallAgent));

export default router;
