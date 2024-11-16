import type { Request, Response, ApiResponse } from '../../../types/express';
import type { Host, CreateHostRequest, UpdateHostRequest } from '../../../types/models-shared';
import { ApiError } from '../../../types/error';
import { logger } from '../../utils/logger';
import * as hostService from './service';

export interface HostParams {
  id: string;
}

type HostResponse = ApiResponse<Host>;
type HostListResponse = ApiResponse<Host[]>;

/**
 * List all hosts for a user
 */
export async function listHosts(
  req: Request,
  res: Response<HostListResponse>
): Promise<void> {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', undefined, 401);
    }

    const hosts = await hostService.listHosts(req.user.id);
    res.json({
      success: true,
      data: hosts,
    });
  } catch (error) {
    logger.error('Failed to list hosts:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to list hosts',
    });
  }
}

/**
 * Get a specific host by ID
 */
export async function getHost(
  req: Request<HostParams>,
  res: Response<HostResponse>
): Promise<void> {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', undefined, 401);
    }

    const host = await hostService.getHost(req.user.id, req.params.id);

    if (!host) {
      res.status(404).json({
        success: false,
        error: 'Host not found',
      });
      return;
    }

    res.json({
      success: true,
      data: host,
    });
  } catch (error) {
    logger.error('Failed to get host:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.id,
      hostId: req.params.id,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to get host',
    });
  }
}

/**
 * Create a new host
 */
export async function createHost(
  req: Request<unknown, HostResponse, CreateHostRequest>,
  res: Response<HostResponse>
): Promise<void> {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', undefined, 401);
    }

    const host = await hostService.createHost(req.user.id, req.body);
    res.status(201).json({
      success: true,
      data: host,
    });
  } catch (error) {
    logger.error('Failed to create host:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to create host',
    });
  }
}

/**
 * Update an existing host
 */
export async function updateHost(
  req: Request<HostParams, HostResponse, UpdateHostRequest>,
  res: Response<HostResponse>
): Promise<void> {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', undefined, 401);
    }

    const host = await hostService.updateHost(req.user.id, req.params.id, req.body);

    if (!host) {
      res.status(404).json({
        success: false,
        error: 'Host not found',
      });
      return;
    }

    res.json({
      success: true,
      data: host,
    });
  } catch (error) {
    logger.error('Failed to update host:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.id,
      hostId: req.params.id,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to update host',
    });
  }
}

/**
 * Delete a host
 */
export async function deleteHost(
  req: Request<HostParams>,
  res: Response<ApiResponse>
): Promise<void> {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', undefined, 401);
    }

    await hostService.deleteHost(req.user.id, req.params.id);

    res.json({
      success: true,
    });
  } catch (error) {
    logger.error('Failed to delete host:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.id,
      hostId: req.params.id,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to delete host',
    });
  }
}

/**
 * Test connection to a host
 */
export async function testConnection(
  req: Request<HostParams>,
  res: Response<ApiResponse>
): Promise<void> {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', undefined, 401);
    }

    const host = await hostService.getHost(req.user.id, req.params.id);

    if (!host) {
      res.status(404).json({
        success: false,
        error: 'Host not found',
      });
      return;
    }

    await hostService.testConnection(host);
    res.json({
      success: true,
    });
  } catch (error) {
    logger.error('Failed to test host connection:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.id,
      hostId: req.params.id,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to test connection',
    });
  }
}
