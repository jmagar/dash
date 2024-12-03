import express from 'express';

import { ApiError } from '../../types/error';
import { createAuthHandler, type AuthenticatedRequestHandler } from '../../types/express';
import type { LogMetadata } from '../../types/logger';
import type { Package, ApiResponse } from '../../types/models-shared';
import { query } from '../db';
import { LoggingManager } from '../utils/logging/LoggingManager';

const router = express.Router();

interface PackageParams {
  hostId: string;
}

interface InstallPackageBody {
  package: string;
}

type PackageListResponse = ApiResponse<Package[]>;
type PackageInstallResponse = ApiResponse<void>;

// List packages
const listPackages: AuthenticatedRequestHandler<PackageParams, PackageListResponse> = async (req, res) => {
  const { hostId } = req.params;

  try {
    LoggingManager.getInstance().info('Listing packages', { hostId: String(hostId) });

    // This is a placeholder. In a real implementation, this would
    // connect to the host and list installed packages.
    const result = await query('SELECT 1');
    if (!result) {
      const metadata: LogMetadata = {
        hostId: String(hostId),
      };
      LoggingManager.getInstance().error('Database connection failed:', metadata);
      throw new ApiError('Failed to connect to database', undefined, 500, metadata);
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

    LoggingManager.getInstance().info('Packages listed successfully', { hostId: String(hostId), count: packages.length });
    const response: PackageListResponse = {
      success: true,
      data: packages,
    };
    return res.json(response);
  } catch (error) {
    const metadata: LogMetadata = {
      hostId: String(hostId),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    LoggingManager.getInstance().error('Failed to list packages:', metadata);

    const apiError = new ApiError(
      error instanceof Error ? error.message : 'Failed to list packages',
      undefined,
      500,
      metadata,
    );
    return res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
};

// Install package
const installPackage: AuthenticatedRequestHandler<PackageParams, PackageInstallResponse, InstallPackageBody> = async (
  req,
  res,
) => {
  const { hostId } = req.params;
  const { package: packageName } = req.body;

  try {
    if (!packageName) {
      const metadata: LogMetadata = { hostId: String(hostId) };
      LoggingManager.getInstance().warn('Package installation failed: No package name provided', metadata);
      throw new ApiError('Package name is required', undefined, 400, metadata);
    }

    LoggingManager.getInstance().info('Installing package', { hostId: String(hostId), package: packageName });

    // This is a placeholder. In a real implementation, this would
    // connect to the host and install the package.
    const result = await query('SELECT 1');
    if (!result) {
      const metadata: LogMetadata = {
        hostId: String(hostId),
        package: packageName,
      };
      LoggingManager.getInstance().error('Database connection failed:', metadata);
      throw new ApiError('Failed to connect to database', undefined, 500, metadata);
    }

    LoggingManager.getInstance().info('Package installed successfully', { hostId: String(hostId), package: packageName });
    const response: PackageInstallResponse = {
      success: true,
    };
    return res.json(response);
  } catch (error) {
    const metadata: LogMetadata = {
      hostId: String(hostId),
      package: String(req.body.package),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    LoggingManager.getInstance().error('Failed to install package:', metadata);

    const apiError = new ApiError(
      error instanceof Error ? error.message : 'Failed to install package',
      undefined,
      500,
      metadata,
    );
    return res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
};

// Register routes
router.get('/:hostId', createAuthHandler(listPackages));
router.post('/:hostId/install', createAuthHandler(installPackage));

export default router;

