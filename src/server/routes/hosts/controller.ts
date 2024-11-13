import type { Request, Response } from 'express';

import * as hostService from './service';
import { createApiError } from '../../../types/error';
import type { LogMetadata } from '../../../types/logger';
import cache from '../../cache';
import { logger } from '../../utils/logger';

export async function getHost(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    logger.info('Getting host', { hostId: String(id) });
    const host = await hostService.getHostById(id);
    if (!host) {
      const metadata: LogMetadata = { hostId: String(id) };
      logger.warn('Host not found', metadata);
      throw createApiError('Host not found', 404, metadata);
    }

    logger.info('Host retrieved successfully', { hostId: String(id) });
    res.json({ success: true, data: host });
  } catch (error) {
    const metadata: LogMetadata = {
      hostId: String(id),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to get host:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to get host',
      error instanceof Error && error.message.includes('not found') ? 404 : 500,
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
    logger.info('Deleting host', { hostId: String(id) });
    await hostService.deleteHost(id);

    logger.info('Host deleted successfully', { hostId: String(id) });
    res.json({ success: true });
  } catch (error) {
    const metadata: LogMetadata = {
      hostId: String(id),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to delete host:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to delete host',
      error instanceof Error && error.message.includes('not found') ? 404 : 500,
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
    logger.info('Testing host connection', { hostId: String(id) });

    // TODO: Implement testHost in service
    await new Promise<void>((resolve) => setTimeout(resolve, 1000)); // Placeholder

    // Invalidate host cache after successful test
    await cache.invalidateHostCache(id);

    logger.info('Host connection test successful', { hostId: String(id) });
    res.json({ success: true });
  } catch (error) {
    const metadata: LogMetadata = {
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
