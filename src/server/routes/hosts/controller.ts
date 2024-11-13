import type { Request, Response } from 'express';

import * as hostService from './service';
import type { CreateHostRequest, UpdateHostRequest } from './types';
import { createApiError } from '../../../types/error';
import type { LogMetadata } from '../../../types/logger';
import { logger } from '../../utils/logger';

export async function listHosts(req: Request, res: Response): Promise<void> {
  try {
    logger.info('Listing hosts');
    const hosts = await hostService.getAllHosts();
    logger.info('Hosts listed successfully', { count: hosts.length });
    res.json({ success: true, data: hosts });
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
    res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
}

export async function getHost(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    logger.info('Getting host', { hostId: id });
    const host = await hostService.getHostById(id);
    if (!host) {
      const metadata: LogMetadata = { hostId: id };
      logger.warn('Host not found', metadata);
      const apiError = createApiError('Host not found', 404, metadata);
      res.status(404).json({
        success: false,
        error: apiError.message,
      });
      return;
    }
    logger.info('Host retrieved successfully', { hostId: id });
    res.json({ success: true, data: host });
  } catch (error) {
    const metadata: LogMetadata = {
      hostId: id,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to get host:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to get host',
      500,
      metadata,
    );
    res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
}

export async function testConnection(req: Request, res: Response): Promise<void> {
  const { hostname, port, username, password } = req.body;
  const effectiveUsername = process.env.DISABLE_AUTH === 'true' ? 'dev' : username;

  try {
    logger.info('Testing connection', { hostname, port, username });
    // TODO: Implement testConnection in service
    await new Promise<void>((resolve) => setTimeout(resolve, 1000)); // Placeholder
    logger.info('Connection test successful', { hostname, port, username: effectiveUsername });
    res.json({ success: true });
  } catch (error) {
    const metadata: LogMetadata = {
      hostname,
      port,
      username: effectiveUsername,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Connection test failed:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Connection test failed',
      400,
      metadata,
    );
    res.status(apiError.status || 400).json({
      success: false,
      error: apiError.message,
    });
  }
}

export async function createHost(req: Request<any, any, CreateHostRequest>, res: Response): Promise<void> {
  try {
    logger.info('Creating host', {
      hostname: req.body.hostname,
      port: req.body.port,
      username: req.body.username,
    });

    const host = await hostService.createHost(req.body);
    logger.info('Host created successfully', {
      hostId: host.id,
      hostname: host.hostname,
    });
    res.json({ success: true, data: host });
  } catch (error) {
    const metadata: LogMetadata = {
      hostname: req.body.hostname,
      port: req.body.port,
      username: req.body.username,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to create host:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to create host',
      500,
      metadata,
    );
    res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
}

export async function updateHost(req: Request<any, any, UpdateHostRequest>, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    logger.info('Updating host', {
      hostId: id,
      hostname: req.body.hostname,
      port: req.body.port,
      username: req.body.username,
    });

    const host = await hostService.updateHost(id, req.body);
    logger.info('Host updated successfully', {
      hostId: host.id,
      hostname: host.hostname,
    });
    res.json({ success: true, data: host });
  } catch (error) {
    const metadata: LogMetadata = {
      hostId: id,
      hostname: req.body.hostname,
      port: req.body.port,
      username: req.body.username,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to update host:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to update host',
      500,
      metadata,
    );
    res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
}

export async function deleteHost(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    logger.info('Deleting host', { hostId: id });
    await hostService.deleteHost(id);
    logger.info('Host deleted successfully', { hostId: id });
    res.json({ success: true });
  } catch (error) {
    const metadata: LogMetadata = {
      hostId: id,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to delete host:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to delete host',
      500,
      metadata,
    );
    res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
}

export async function testHost(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    logger.info('Testing host connection', { hostId: id });
    // TODO: Implement testHost in service
    await new Promise<void>((resolve) => setTimeout(resolve, 1000)); // Placeholder
    logger.info('Host connection test successful', { hostId: id });
    res.json({ success: true });
  } catch (error) {
    const metadata: LogMetadata = {
      hostId: id,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Host connection test failed:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Host connection test failed',
      400,
      metadata,
    );
    res.status(apiError.status || 400).json({
      success: false,
      error: apiError.message,
    });
  }
}
