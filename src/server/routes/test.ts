import { Router } from 'express';

import { createApiError } from '../../types/error';
import { type RequestHandler } from '../../types/express';
import type { LogMetadata } from '../../types/logger';
import { logger } from '../utils/logger';

const router = Router();

export const testRoute: RequestHandler = async (req, res) => {
  try {
    const metadata: LogMetadata = {
      method: req.method,
      path: req.path,
    };
    logger.info('Test route accessed:', metadata);

    return res.json({
      success: true,
      message: 'Test route working',
    });
  } catch (error) {
    const metadata: LogMetadata = {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Test route failed:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Test route failed',
      500,
      metadata,
    );
    return res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
};

router.get('/', testRoute);

export default router;
