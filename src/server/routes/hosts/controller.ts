import { Request, Response } from 'express';

import { testSSHConnection } from './pool';
import * as hostService from './service';
import type { RequestParams, HostResponse, CreateHostRequest, UpdateHostRequest, DeleteHostResponse } from './types';
import { serverLogger as logger } from '../../../utils/serverLogger';
import type { AuthenticatedRequest } from '../../middleware/auth';

export async function listHosts(_req: Request, res: Response<HostResponse>): Promise<void> {
  try {
    const hosts = await hostService.listHosts();
    res.json({ success: true, data: hosts });
  } catch (err) {
    logger.error('Error listing hosts:', { error: (err as Error).message, stack: (err as Error).stack });
    res.status(500).json({ success: false, error: 'Failed to list hosts' });
  }
}

export async function getHost(req: Request<RequestParams>, res: Response<HostResponse>): Promise<void> {
  try {
    const host = await hostService.getHost(req.params.id);
    res.json({ success: true, data: host });
  } catch (err) {
    if ((err as Error).message === 'Host not found') {
      res.status(404).json({ success: false, error: 'Host not found' });
    } else {
      logger.error('Error getting host:', { error: (err as Error).message, stack: (err as Error).stack });
      res.status(500).json({ success: false, error: 'Failed to get host' });
    }
  }
}

export async function testConnection(
  req: AuthenticatedRequest<Record<string, never>, HostResponse, CreateHostRequest>,
  res: Response<HostResponse>,
): Promise<void> {
  try {
    const { hostname, port, username, password } = req.body;

    await testSSHConnection({
      host: hostname,
      port,
      username: username || (process.env.DISABLE_AUTH === 'true' ? 'dev' : req.user?.username || 'dev'),
      password,
    });

    res.json({ success: true });
  } catch (err) {
    const errorMessage = (err as Error).message || 'Connection failed';
    logger.error('Error testing connection:', { error: errorMessage, stack: (err as Error).stack });
    res.status(400).json({ success: false, error: errorMessage });
  }
}

export async function createHost(
  req: AuthenticatedRequest<Record<string, never>, HostResponse, CreateHostRequest>,
  res: Response<HostResponse>,
): Promise<void> {
  try {
    const host = await hostService.createHost({
      ...req.body,
      username: req.body.username || (process.env.DISABLE_AUTH === 'true' ? 'dev' : req.user?.username || 'dev'),
    });
    res.json({ success: true, data: host });
  } catch (err) {
    logger.error('Error creating host:', { error: (err as Error).message, stack: (err as Error).stack });
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function updateHost(
  req: AuthenticatedRequest<RequestParams, HostResponse, UpdateHostRequest>,
  res: Response<HostResponse>,
): Promise<void> {
  try {
    const host = await hostService.updateHost(req.params.id, {
      ...req.body,
      username: req.body.username || (process.env.DISABLE_AUTH === 'true' ? 'dev' : req.user?.username || 'dev'),
    });
    res.json({ success: true, data: host });
  } catch (err) {
    logger.error('Error updating host:', { error: (err as Error).message, stack: (err as Error).stack });
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function deleteHost(req: Request<RequestParams>, res: Response<DeleteHostResponse>): Promise<void> {
  try {
    await hostService.deleteHost(req.params.id);
    res.json({ success: true });
  } catch (err) {
    logger.error('Error deleting host:', { error: (err as Error).message, stack: (err as Error).stack });
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function testHost(req: Request<RequestParams>, res: Response<DeleteHostResponse>): Promise<void> {
  try {
    await hostService.testHost(req.params.id);
    res.json({ success: true });
  } catch (err) {
    const errorMessage = (err as Error).message || 'Connection failed';
    logger.error('Error testing connection:', { error: errorMessage, stack: (err as Error).stack });
    res.status(400).json({ success: false, error: errorMessage });
  }
}
