import type { Request, Response } from 'express';

import { createApiError } from '../../../types/error';
import type { LogMetadata } from '../../../types/logger';
import cache from '../../cache';
import { errorAggregator } from '../../services/errorAggregator';
import { logger } from '../../utils/logger';

export async function invalidateHostCache(req: Request, res: Response): Promise<void> {
  const { hostId } = req.params;

  try {
    await cache.invalidateHostCache(hostId);
    logger.info('Host cache invalidated', { hostId: String(hostId) });
    res.json({ success: true });
  } catch (error) {
    const metadata: LogMetadata = {
      hostId: String(hostId),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to invalidate host cache:', metadata);
    errorAggregator.trackError(
      error instanceof Error ? error : new Error('Failed to invalidate host cache'),
      metadata,
    );

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to invalidate host cache',
      500,
      metadata,
    );
    res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
}
