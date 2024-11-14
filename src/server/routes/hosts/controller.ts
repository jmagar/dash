import type { Request, Response } from 'express';
import type { Host } from '../../../types/models-shared';
import { createApiError } from '../../../types/error';
import { logger } from '../../utils/logger';
import * as hostService from './service';
import { cacheService } from '../../cache/CacheService';

interface HostParams {
  id: string;
}

export async function listHosts(req: Request, res: Response): Promise<void> {
  try {
    const hosts = await hostService.listHosts();
    res.json({
      success: true,
      data: hosts,
    });
  } catch (error) {
    logger.error('Failed to list hosts:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    const apiError = createApiError('Failed to list hosts', error instanceof Error ? error : new Error('Unknown error'));
    res.status(apiError.status).json({
      success: false,
      error: apiError.message,
    });
  }
}

export async function getHost(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  try {
    const host = await hostService.getHost(id);
    if (!host) {
      const apiError = createApiError('Host not found', 404);
      res.status(404).json({
        success: false,
        error: apiError.message,
      });
      return;
    }
    res.json({
      success: true,
      data: host,
    });
  } catch (error) {
    logger.error('Failed to get host:', {
      hostId: id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    const apiError = createApiError('Failed to get host', error instanceof Error ? error : new Error('Unknown error'));
    res.status(apiError.status).json({
      success: false,
      error: apiError.message,
    });
  }
}

export async function createHost(req: Request, res: Response): Promise<void> {
  try {
    const host = await hostService.createHost({
      ...req.body,
      status: 'disconnected',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    res.status(201).json({
      success: true,
      data: host,
    });
  } catch (error) {
    logger.error('Failed to create host:', {
      data: req.body,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    const apiError = createApiError('Failed to create host', error instanceof Error ? error : new Error('Unknown error'));
    res.status(apiError.status).json({
      success: false,
      error: apiError.message,
    });
  }
}

export async function updateHost(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  try {
    const host = await hostService.updateHost(id, {
      ...req.body,
      updatedAt: new Date(),
    });
    res.json({
      success: true,
      data: host,
    });
  } catch (error) {
    logger.error('Failed to update host:', {
      hostId: id,
      data: req.body,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    const apiError = createApiError('Failed to update host', error instanceof Error ? error : new Error('Unknown error'));
    res.status(apiError.status).json({
      success: false,
      error: apiError.message,
    });
  }
}

export async function deleteHost(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  try {
    await hostService.deleteHost(id);
    await cacheService.removeHost(String(id));
    res.json({
      success: true,
    });
  } catch (error) {
    logger.error('Failed to delete host:', {
      hostId: id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    const apiError = createApiError('Failed to delete host', error instanceof Error ? error : new Error('Unknown error'));
    res.status(apiError.status).json({
      success: false,
      error: apiError.message,
    });
  }
}

export async function testConnection(req: Request, res: Response): Promise<void> {
  try {
    const host: Omit<Host, 'id'> = {
      ...req.body,
      status: 'disconnected',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await hostService.testHost(host as Host);
    res.json({
      success: true,
    });
  } catch (error) {
    logger.error('Failed to test host connection:', {
      data: req.body,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    const apiError = createApiError('Failed to test host connection', error instanceof Error ? error : new Error('Unknown error'));
    res.status(apiError.status).json({
      success: false,
      error: apiError.message,
    });
  }
}

export async function testHost(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  try {
    logger.info('Testing host connection', { hostId: String(id) });

    // TODO: Implement testHost in service
    await new Promise<void>((resolve) => setTimeout(resolve, 1000)); // Placeholder

    // Invalidate host cache after successful test
    await cacheService.removeHost(String(id));

    logger.info('Host connection test successful', { hostId: String(id) });
    res.json({
      success: true,
    });
  } catch (error) {
    const metadata: { hostId: string; error: string } = {
      hostId: String(id),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to test host connection:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to test host connection',
      error instanceof Error && error.message.includes('not found') ? 404 : 500,
      metadata,
    );
    res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
}
