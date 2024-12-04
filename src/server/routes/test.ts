import { Router } from 'express';

import { ApiError } from '../../types/error';
import { type RequestHandler } from '../../types/express';
import type { LogMetadata } from '../../types/logger';
import { LoggingManager } from '../managers/utils/LoggingManager';

const router = Router();

export const testRoute: RequestHandler = async (req, res) => {
  try {
    const metadata: LogMetadata = {
      method: req.method,
      path: req.path,
    };
    LoggingManager.getInstance().info('Test route accessed:', metadata);

    return res.json({
      success: true,
      message: 'Test route working',
    });
  } catch (error) {
    const metadata: LogMetadata = {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    LoggingManager.getInstance().error('Test route failed:', metadata);

    const apiError = new ApiError(
      error instanceof Error ? error.message : 'Test route failed',
      undefined,
      500,
      metadata
    );
    return res.status(apiError.status).json({
      success: false,
      error: apiError.message,
    });
  }
};

router.get('/', testRoute);

export default router;


