
import { ApiError } from '../../../types/error';
import { createRouter, logRouteAccess } from '../routeUtils';
import type { RequestHandler } from '../../../types/express';
import type { LogMetadata } from '../../../types/logger';

export const router = createRouter();

export const testRoute: RequestHandler = async (req, res) => {
  try {
    const metadata: LogMetadata = {
      method: req.method,
      path: req.path,
    };
    logRouteAccess('Test', metadata);

    return res.json({
      success: true,
      message: 'Test route working',
    });
  } catch (error) {
    const metadata: LogMetadata = {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logRouteAccess('Test', metadata);

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
