import type { AuthenticatedRequest, Response, ApiResponse } from '../../../types/express';
import type { Host, CreateHostRequest, UpdateHostRequest } from '../../../types/models-shared';
import type { SystemMetrics } from '../../../types/metrics';
import { AgentStatus } from '../../../types/agent-config';
import { ApiError } from '../../../types/error';
import * as hostService from './service';
import { getAgentService } from '../../services/agent.service';
import { metricsStorageService } from '../../services/metrics-storage.service';

// Request parameter types
export interface HostIdParam {
  id: string;
}

// Response data types (without ApiResponse wrapper)
export type HostListData = Host[];
export type HostData = Host;
export type HostStatsData = SystemMetrics;

// Map AgentStatus to Host's agentStatus
function mapAgentStatus(status: AgentStatus): Host['agentStatus'] {
  switch (status) {
    case AgentStatus.CONNECTED:
    case AgentStatus.CONNECTING:
      return 'installed';
    case AgentStatus.ERROR:
      return 'error';
    case AgentStatus.DISCONNECTED:
    case AgentStatus.UNKNOWN:
    default:
      return null;
  }
}

/**
 * List all hosts for a user
 */
export async function listHosts(
  req: AuthenticatedRequest<Record<string, never>>,
  res: Response<ApiResponse<HostListData>>
): Promise<void> {
  if (!req.user) {
    throw new ApiError('Authentication required', undefined, 401);
  }

  const hosts = await hostService.listHosts(req.user.id);
  res.json({
    success: true,
    data: hosts,
  });
}

/**
 * Get a specific host by ID
 */
export async function getHost(
  req: AuthenticatedRequest<HostIdParam>,
  res: Response<ApiResponse<HostData>>
): Promise<void> {
  if (!req.user) {
    throw new ApiError('Authentication required', undefined, 401);
  }

  const host = await hostService.getHost(req.user.id, req.params.id);
  if (!host) {
    throw new ApiError('Host not found', undefined, 404);
  }

  res.json({
    success: true,
    data: host,
  });
}

/**
 * Create a new host
 */
export async function createHost(
  req: AuthenticatedRequest<Record<string, never>, ApiResponse<HostData>, CreateHostRequest>,
  res: Response<ApiResponse<HostData>>
): Promise<void> {
  if (!req.user) {
    throw new ApiError('Authentication required', undefined, 401);
  }

  const host = await hostService.createHost(req.user.id, req.body);
  res.status(201).json({
    success: true,
    data: host,
  });
}

/**
 * Update an existing host
 */
export async function updateHost(
  req: AuthenticatedRequest<HostIdParam, ApiResponse<HostData>, UpdateHostRequest>,
  res: Response<ApiResponse<HostData>>
): Promise<void> {
  if (!req.user) {
    throw new ApiError('Authentication required', undefined, 401);
  }

  const host = await hostService.updateHost(req.user.id, req.params.id, req.body);
  if (!host) {
    throw new ApiError('Host not found', undefined, 404);
  }

  res.json({
    success: true,
    data: host,
  });
}

/**
 * Delete a host
 */
export async function deleteHost(
  req: AuthenticatedRequest<HostIdParam>,
  res: Response<ApiResponse<void>>
): Promise<void> {
  if (!req.user) {
    throw new ApiError('Authentication required', undefined, 401);
  }

  await hostService.deleteHost(req.user.id, req.params.id);
  res.json({
    success: true,
  });
}

/**
 * Test connection to a host
 */
export async function testConnection(
  req: AuthenticatedRequest<HostIdParam>,
  res: Response<ApiResponse<void>>
): Promise<void> {
  if (!req.user) {
    throw new ApiError('Authentication required', undefined, 401);
  }

  const host = await hostService.getHost(req.user.id, req.params.id);
  if (!host) {
    throw new ApiError('Host not found', undefined, 404);
  }

  await hostService.testConnection(host);
  res.json({
    success: true,
  });
}

/**
 * Get host stats
 */
export async function getHostStats(
  req: AuthenticatedRequest<HostIdParam>,
  res: Response<ApiResponse<HostStatsData>>
): Promise<void> {
  if (!req.user) {
    throw new ApiError('Authentication required', undefined, 401);
  }

  const host = await hostService.getHost(req.user.id, req.params.id);
  if (!host) {
    throw new ApiError('Host not found', undefined, 404);
  }

  const metrics = await metricsStorageService.getLatestMetrics(host);
  if (!metrics) {
    throw new ApiError('No metrics available', undefined, 404);
  }

  res.json({
    success: true,
    data: metrics
  });
}

/**
 * Get host status
 */
export async function getHostStatus(
  req: AuthenticatedRequest<HostIdParam>,
  res: Response<ApiResponse<HostData>>
): Promise<void> {
  if (!req.user) {
    throw new ApiError('Authentication required', undefined, 401);
  }

  const host = await hostService.getHost(req.user.id, req.params.id);
  if (!host) {
    throw new ApiError('Host not found', undefined, 404);
  }

  const agentService = getAgentService();
  const agentStatus = agentService.getAgentStatus(host.id);
  const agentMetrics = agentService.getAgentMetrics(host.id);
  const isConnected = agentService.isConnected(host.id);

  const updatedHost: Host = {
    ...host,
    agentStatus: mapAgentStatus(agentStatus),
    status: isConnected ? 'online' : 'offline',
    metadata: {
      ...host.metadata,
      agentMetrics
    }
  };

  res.json({
    success: true,
    data: updatedHost
  });
}

/**
 * Connect to host
 */
export async function connectHost(
  req: AuthenticatedRequest<HostIdParam>,
  res: Response<ApiResponse<void>>
): Promise<void> {
  if (!req.user) {
    throw new ApiError('Authentication required', undefined, 401);
  }

  const host = await hostService.getHost(req.user.id, req.params.id);
  if (!host) {
    throw new ApiError('Host not found', undefined, 404);
  }

  // Test SSH connection first
  await hostService.testConnection(host);

  // Then ensure agent is connected
  const agentService = getAgentService();
  if (!agentService.isConnected(host.id)) {
    const attempts = 3;
    const timeout = 5000;

    for (let i = 0; i < attempts; i++) {
      await new Promise(resolve => setTimeout(resolve, timeout));
      if (agentService.isConnected(host.id)) {
        break;
      }
      if (i === attempts - 1) {
        throw new Error('Failed to reconnect agent after multiple attempts');
      }
    }
  }

  res.json({
    success: true,
    message: 'Host connected successfully'
  });
}

/**
 * Disconnect from host
 */
export async function disconnectHost(
  req: AuthenticatedRequest<HostIdParam>,
  res: Response<ApiResponse<void>>
): Promise<void> {
  if (!req.user) {
    throw new ApiError('Authentication required', undefined, 401);
  }

  const host = await hostService.getHost(req.user.id, req.params.id);
  if (!host) {
    throw new ApiError('Host not found', undefined, 404);
  }

  const agentService = getAgentService();
  if (agentService.isConnected(host.id)) {
    agentService.disconnectAgent(host.id);
  }

  res.json({
    success: true,
    message: 'Host disconnected successfully'
  });
}
