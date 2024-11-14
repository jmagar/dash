import * as hostService from './service';
import { createApiError } from '../../../types/error';
import { type AuthenticatedRequestHandler } from '../../../types/express';
import type { LogMetadata } from '../../../types/logger';
import type { CreateHostRequest, UpdateHostRequest } from '../../../types/models-shared';
import cache from '../../cache';
import { logger } from '../../utils/logger';

interface HostParams {
  id: string;
}

export const listHosts: AuthenticatedRequestHandler = async (_req, res) => {
  try {
    logger.info('Listing hosts');
    const hosts = await hostService.getAllHosts();
    logger.info('Hosts listed successfully', { count: hosts.length });
    return res.json({ success: true, data: hosts });
  } catch (error) {
    const metadata: LogMetadata = {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to list hosts:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to list hosts',
      500,
      metadata,
    );
    return res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
};

export const getHost: AuthenticatedRequestHandler<HostParams> = async (req, res) => {
  const { id } = req.params;
  const hostId = parseInt(id, 10);

  if (isNaN(hostId)) {
    const error = createApiError('Invalid host ID', 400);
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }

  try {
    logger.info('Getting host', { hostId: String(hostId) });
    const host = await hostService.getHostById(hostId);
    if (!host) {
      const metadata: LogMetadata = { hostId: String(hostId) };
      logger.warn('Host not found', metadata);
      throw createApiError('Host not found', 404, metadata);
    }

    logger.info('Host retrieved successfully', { hostId: String(hostId) });
    return res.json({ success: true, data: host });
  } catch (error) {
    const metadata: LogMetadata = {
      hostId: String(hostId),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to get host:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to get host',
      error instanceof Error && error.message.includes('not found') ? 404 : 500,
      metadata,
    );
    return res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
};

export const createHost: AuthenticatedRequestHandler<unknown, unknown, CreateHostRequest> = async (req, res) => {
  try {
    logger.info('Creating host', { data: req.body });
    const host = await hostService.createHost(req.body);
    logger.info('Host created successfully', { hostId: host.id });
    return res.json({ success: true, data: host });
  } catch (error) {
    const metadata: LogMetadata = {
      data: req.body,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to create host:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to create host',
      500,
      metadata,
    );
    return res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
};

export const updateHost: AuthenticatedRequestHandler<HostParams, unknown, UpdateHostRequest> = async (req, res) => {
  const { id } = req.params;
  const hostId = parseInt(id, 10);

  if (isNaN(hostId)) {
    const error = createApiError('Invalid host ID', 400);
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }

  try {
    logger.info('Updating host', { hostId: String(hostId), data: req.body });
    const host = await hostService.updateHost(hostId, req.body);
    logger.info('Host updated successfully', { hostId: String(hostId) });
    return res.json({ success: true, data: host });
  } catch (error) {
    const metadata: LogMetadata = {
      hostId: String(hostId),
      data: req.body,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to update host:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to update host',
      error instanceof Error && error.message.includes('not found') ? 404 : 500,
      metadata,
    );
    return res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
};

export const deleteHost: AuthenticatedRequestHandler<HostParams> = async (req, res) => {
  const { id } = req.params;
  const hostId = parseInt(id, 10);

  if (isNaN(hostId)) {
    const error = createApiError('Invalid host ID', 400);
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }

  try {
    logger.info('Deleting host', { hostId: String(hostId) });
    await hostService.deleteHost(hostId);

    logger.info('Host deleted successfully', { hostId: String(hostId) });
    return res.json({ success: true });
  } catch (error) {
    const metadata: LogMetadata = {
      hostId: String(hostId),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to delete host:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to delete host',
      error instanceof Error && error.message.includes('not found') ? 404 : 500,
      metadata,
    );
    return res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
};

export const testConnection: AuthenticatedRequestHandler<unknown, unknown, CreateHostRequest> = async (req, res) => {
  try {
    logger.info('Testing connection', { data: req.body });
    // TODO: Implement connection test
    await new Promise<void>((resolve) => setTimeout(resolve, 1000)); // Placeholder
    logger.info('Connection test successful');
    return res.json({ success: true });
  } catch (error) {
    const metadata: LogMetadata = {
      data: req.body,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to test connection:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to test connection',
      500,
      metadata,
    );
    return res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
};

export const testHost: AuthenticatedRequestHandler<HostParams> = async (req, res) => {
  const { id } = req.params;
  const hostId = parseInt(id, 10);

  if (isNaN(hostId)) {
    const error = createApiError('Invalid host ID', 400);
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }

  try {
    logger.info('Testing host connection', { hostId: String(hostId) });

    // TODO: Implement testHost in service
    await new Promise<void>((resolve) => setTimeout(resolve, 1000)); // Placeholder

    // Invalidate host cache after successful test
    await cache.invalidateHostCache(String(hostId));

    logger.info('Host connection test successful', { hostId: String(hostId) });
    return res.json({ success: true });
  } catch (error) {
    const metadata: LogMetadata = {
      hostId: String(hostId),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to test host connection:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to test host connection',
      error instanceof Error && error.message.includes('not found') ? 404 : 500,
      metadata,
    );
    return res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
};
