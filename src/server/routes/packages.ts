import express, { RequestHandler } from 'express';

import { createApiError } from '../../types/error';
import type { LogMetadata } from '../../types/logger';
import type { Package, ApiResponse } from '../../types/models-shared';
import { query } from '../db';
import { logger } from '../utils/logger';

const router = express.Router();

interface ListPackagesParams {
  hostId: string;
}

interface InstallPackageParams {
  hostId: string;
}

interface InstallPackageBody {
  package: string;
}

// List packages
const listPackages: RequestHandler<ListPackagesParams> = async (req, res) => {
  const { hostId } = req.params;

  try {
    logger.info('Listing packages', { hostId: String(hostId) });

    // This is a placeholder. In a real implementation, this would
    // connect to the host and list installed packages.
    const result = await query('SELECT 1');
    if (!result) {
      const metadata: LogMetadata = {
        hostId: String(hostId),
      };
      logger.error('Database connection failed:', metadata);
      throw createApiError('Failed to connect to database', 500, metadata);
    }

    const packages: Package[] = [
      {
        name: 'example-package',
        version: '1.0.0',
        description: 'Example package',
        installed: true,
        updateAvailable: false,
      },
    ];

    logger.info('Packages listed successfully', { hostId: String(hostId), count: packages.length });
    const response: ApiResponse<Package[]> = {
      success: true,
      data: packages,
    };
    res.json(response);
  } catch (error) {
    const metadata: LogMetadata = {
      hostId: String(hostId),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to list packages:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to list packages',
      500,
      metadata,
    );
    res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
};

// Install package
const installPackage: RequestHandler<InstallPackageParams, unknown, InstallPackageBody> = async (
  req,
  res,
) => {
  const { hostId } = req.params;
  const { package: packageName } = req.body;

  try {
    if (!packageName) {
      const metadata: LogMetadata = { hostId: String(hostId) };
      logger.warn('Package installation failed: No package name provided', metadata);
      throw createApiError('Package name is required', 400, metadata);
    }

    logger.info('Installing package', { hostId: String(hostId), package: packageName });

    // This is a placeholder. In a real implementation, this would
    // connect to the host and install the package.
    const result = await query('SELECT 1');
    if (!result) {
      const metadata: LogMetadata = {
        hostId: String(hostId),
        package: packageName,
      };
      logger.error('Database connection failed:', metadata);
      throw createApiError('Failed to connect to database', 500, metadata);
    }

    logger.info('Package installed successfully', { hostId: String(hostId), package: packageName });
    const response: ApiResponse<void> = { success: true };
    res.json(response);
  } catch (error) {
    const metadata: LogMetadata = {
      hostId: String(hostId),
      package: packageName,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to install package:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to install package',
      error instanceof Error && error.message.includes('required') ? 400 : 500,
      metadata,
    );
    res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
};

// Register routes
router.get('/:hostId', listPackages);
router.post('/:hostId/install', installPackage);

export default router;
