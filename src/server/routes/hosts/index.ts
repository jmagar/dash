import { Router } from 'express';
import type { Request, Response } from '../../../types/express';
import type { Host, CreateHostRequest, UpdateHostRequest, ApiResponse } from '../../../types/models-shared';
import { ApiError } from '../../../types/error';
import { logger } from '../../utils/logger';
import { sshService } from '../../services/ssh.service';
import { AgentInstaller } from '../../services/agent-installer';
import { LinuxHandler } from '../../services/agent-installer/linux-handler';
import { WindowsHandler } from '../../services/agent-installer/windows-handler';
import { getAgentService } from '../../services/agent.service';
import { db } from '../../db';
import { LoggingManager } from '../../../../../../../../../../utils/logging/LoggingManager';

const router = Router();
const agentInstaller = new AgentInstaller(
  new LinuxHandler(sshService),
  new WindowsHandler(sshService)
);

interface HostParams {
  id: string;
}

type HostResponse = ApiResponse<Host>;
type HostListResponse = ApiResponse<Host[]>;

/**
 * List all hosts
 * GET /hosts
 */
router.get('/', async (req: Request, res: Response<HostListResponse>) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', undefined, 401);
    }

    const result = await db.query<Host>(
      'SELECT *, agent_status as "agentStatus" FROM hosts WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );

    const agentService = getAgentService();

    // Enrich with agent status
    const hosts = result.rows.map((host: Host) => ({
      ...host,
      agentConnected: agentService.isConnected(host.id),
      agentMetrics: agentService.getAgentMetrics(host.id),
    }));

    res.json({
      success: true,
      data: hosts,
    });
  } catch (error) {
    loggerLoggingManager.getInstance().();
    throw error;
  }
});

/**
 * Get host by ID
 * GET /hosts/:id
 */
router.get('/:id', async (req: Request<HostParams>, res: Response<HostResponse>) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', undefined, 401);
    }

    const result = await db.query<Host>(
      'SELECT *, agent_status as "agentStatus" FROM hosts WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      throw new ApiError('Host not found', undefined, 404);
    }

    const host = result.rows[0];

    const agentService = getAgentService();

    // Enrich with agent status
    const enrichedHost = {
      ...host,
      agentConnected: agentService.isConnected(host.id),
      agentMetrics: agentService.getAgentMetrics(host.id),
    };

    res.json({
      success: true,
      data: enrichedHost,
    });
  } catch (error) {
    loggerLoggingManager.getInstance().();
    throw error;
  }
});

/**
 * Create new host
 * POST /hosts
 */
router.post('/', async (req: Request<unknown, HostResponse, CreateHostRequest>, res: Response<HostResponse>) => {
  try {
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
        req.user.id,
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

    // Install agent if requested
    if (req.body.install_agent) {
      try {
        await agentInstaller.installAgent(host, {
          installInContainer: false,
          labels: {
            created_by: req.user.id,
            environment: req.body.environment || 'production',
          },
        });
      } catch (error) {
        loggerLoggingManager.getInstance().();
        // Continue since host was created successfully
      }
    }

    res.status(201).json({
      success: true,
      data: host,
    });
  } catch (error) {
    loggerLoggingManager.getInstance().();
    throw error;
  }
});

/**
 * Update host
 * PUT /hosts/:id
 */
router.put('/:id', async (req: Request<HostParams, HostResponse, UpdateHostRequest>, res: Response<HostResponse>) => {
  try {
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
        req.user.id,
      ]
    );

    if (result.rows.length === 0) {
      throw new ApiError('Host not found', undefined, 404);
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    loggerLoggingManager.getInstance().();
    throw error;
  }
});

/**
 * Delete host
 * DELETE /hosts/:id
 */
router.delete('/:id', async (req: Request<HostParams>, res: Response<ApiResponse>) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', undefined, 401);
    }

    // Get host first to check ownership
    const hostResult = await db.query<Host>(
      'SELECT *, agent_status as "agentStatus" FROM hosts WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (hostResult.rows.length === 0) {
      throw new ApiError('Host not found', undefined, 404);
    }

    const host = hostResult.rows[0];

    // Uninstall agent if installed
    if (host.agentStatus === 'installed') {
      try {
        await agentInstaller.uninstallAgent(host);
      } catch (error) {
        loggerLoggingManager.getInstance().();
        // Continue with deletion
      }
    }

    // Delete host
    await db.query(
      'DELETE FROM hosts WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    res.json({
      success: true,
    });
  } catch (error) {
    loggerLoggingManager.getInstance().();
    throw error;
  }
});

/**
 * Install agent on host
 * POST /hosts/:id/agent/install
 */
router.post('/:id/agent/install', async (req: Request<HostParams>, res: Response<ApiResponse>) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', undefined, 401);
    }

    const result = await db.query<Host>(
      'SELECT *, agent_status as "agentStatus" FROM hosts WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      throw new ApiError('Host not found', undefined, 404);
    }

    const host = result.rows[0];

    await agentInstaller.installAgent(host, {
      installInContainer: false,
      labels: {
        installed_by: req.user.id,
        environment: host.environment || 'production',
      },
    });

    res.json({
      success: true,
      message: 'Agent installed successfully',
    });
  } catch (error) {
    loggerLoggingManager.getInstance().();
    throw error;
  }
});

/**
 * Uninstall agent from host
 * POST /hosts/:id/agent/uninstall
 */
router.post('/:id/agent/uninstall', async (req: Request<HostParams>, res: Response<ApiResponse>) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', undefined, 401);
    }

    const result = await db.query<Host>(
      'SELECT *, agent_status as "agentStatus" FROM hosts WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      throw new ApiError('Host not found', undefined, 404);
    }

    const host = result.rows[0];

    await agentInstaller.uninstallAgent(host);

    res.json({
      success: true,
      message: 'Agent uninstalled successfully',
    });
  } catch (error) {
    loggerLoggingManager.getInstance().();
    throw error;
  }
});

export default router;

