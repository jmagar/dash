import { Response } from 'express';

import { testSSHConnection } from './pool';
import * as hostService from './service';
import type { RequestParams, HostResponse, CreateHostRequest, UpdateHostRequest, DeleteHostResponse, Host } from './types';
import { handleApiError } from '../../../types/error';
import { serverLogger as logger } from '../../../utils/serverLogger';
import type { AuthenticatedRequest } from '../../middleware/auth';

export async function listHosts(_req: AuthenticatedRequest, res: Response<HostResponse>): Promise<void> {
  try {
    logger.info('Listing hosts');
    const hosts = await hostService.listHosts();
    logger.info('Hosts listed successfully', { count: hosts.length });
    res.json({ success: true, data: hosts });
  } catch (error) {
    const errorResult = handleApiError<Host[]>(error, 'listHosts');
    res.status(500).json({ success: false, error: errorResult.error });
  }
}

export async function getHost(
  req: AuthenticatedRequest<RequestParams>,
  res: Response<HostResponse>,
): Promise<void> {
  try {
    const { id } = req.params;
    logger.info('Getting host', { hostId: id });
    const host = await hostService.getHost(id);
    logger.info('Host retrieved successfully', { hostId: id });
    res.json({ success: true, data: host });
  } catch (error) {
    if ((error as Error).message === 'Host not found') {
      logger.warn('Host not found', { hostId: req.params.id });
      res.status(404).json({ success: false, error: 'Host not found' });
    } else {
      const errorResult = handleApiError<Host>(error, 'getHost');
      res.status(500).json({ success: false, error: errorResult.error });
    }
  }
}

export async function testConnection(
  req: AuthenticatedRequest<Record<string, never>, HostResponse, CreateHostRequest>,
  res: Response<HostResponse>,
): Promise<void> {
  try {
    const { hostname, port, username, password } = req.body;
    logger.info('Testing connection', { hostname, port, username });

    const effectiveUsername = username || (
      process.env.DISABLE_AUTH === 'true' ? 'dev' : req.user?.username || 'dev'
    );

    await testSSHConnection({
      host: hostname,
      port,
      username: effectiveUsername,
      password,
    });

    logger.info('Connection test successful', { hostname, port, username: effectiveUsername });
    res.json({ success: true });
  } catch (error) {
    const errorResult = handleApiError<void>(error, 'testConnection');
    res.status(400).json({ success: false, error: errorResult.error });
  }
}

export async function createHost(
  req: AuthenticatedRequest<Record<string, never>, HostResponse, CreateHostRequest>,
  res: Response<HostResponse>,
): Promise<void> {
  try {
    const effectiveUsername = req.body.username || (
      process.env.DISABLE_AUTH === 'true' ? 'dev' : req.user?.username || 'dev'
    );

    logger.info('Creating host', {
      hostname: req.body.hostname,
      username: effectiveUsername,
    });

    const host = await hostService.createHost({
      ...req.body,
      username: effectiveUsername,
    });

    logger.info('Host created successfully', {
      hostId: host.id,
      hostname: host.hostname,
    });

    res.json({ success: true, data: host });
  } catch (error) {
    const errorResult = handleApiError<Host>(error, 'createHost');
    res.status(500).json({ success: false, error: errorResult.error });
  }
}

export async function updateHost(
  req: AuthenticatedRequest<RequestParams, HostResponse, UpdateHostRequest>,
  res: Response<HostResponse>,
): Promise<void> {
  try {
    const { id } = req.params;
    const effectiveUsername = req.body.username || (
      process.env.DISABLE_AUTH === 'true' ? 'dev' : req.user?.username || 'dev'
    );

    logger.info('Updating host', {
      hostId: id,
      hostname: req.body.hostname,
      username: effectiveUsername,
    });

    const host = await hostService.updateHost(id, {
      ...req.body,
      username: effectiveUsername,
    });

    logger.info('Host updated successfully', {
      hostId: host.id,
      hostname: host.hostname,
    });

    res.json({ success: true, data: host });
  } catch (error) {
    const errorResult = handleApiError<Host>(error, 'updateHost');
    res.status(500).json({ success: false, error: errorResult.error });
  }
}

export async function deleteHost(
  req: AuthenticatedRequest<RequestParams>,
  res: Response<DeleteHostResponse>,
): Promise<void> {
  try {
    const { id } = req.params;
    logger.info('Deleting host', { hostId: id });
    await hostService.deleteHost(id);
    logger.info('Host deleted successfully', { hostId: id });
    res.json({ success: true });
  } catch (error) {
    const errorResult = handleApiError<void>(error, 'deleteHost');
    res.status(500).json({ success: false, error: errorResult.error });
  }
}

export async function testHost(
  req: AuthenticatedRequest<RequestParams>,
  res: Response<DeleteHostResponse>,
): Promise<void> {
  try {
    const { id } = req.params;
    logger.info('Testing host connection', { hostId: id });
    await hostService.testHost(id);
    logger.info('Host connection test successful', { hostId: id });
    res.json({ success: true });
  } catch (error) {
    const errorResult = handleApiError<void>(error, 'testHost');
    res.status(400).json({ success: false, error: errorResult.error });
  }
}
