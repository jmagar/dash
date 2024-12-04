import { Request, Response } from 'express';
import { ApiError } from '../../../types/error';
import type { ApiResponse } from '../../../types/express';
import { query } from '../../db';
import type { PackageParams, InstallPackageDto } from './dto/packages.dto';
import type { Package } from '../../../types/models-shared';
import { LoggingManager } from '../../managers/LoggingManager';
import type { LogMetadata as BaseLogMetadata } from '../../../types/logger';

interface PackageRow {
  name: string;
  version: string;
  description: string | null;
  installed: boolean;
  latest_version: string | null;
  size: number | null;
  dependencies: string[] | null;
  repository: string | null;
  license: string | null;
  homepage: string | null;
  metadata: Record<string, unknown> | null;
}

interface LogMetadata extends BaseLogMetadata {
  userId: string;
  hostId: string;
  package?: string;
}

const logger = LoggingManager.getInstance();

export const listPackages = async (
  req: Request<PackageParams>,
  res: Response<ApiResponse<Package[]>>
): Promise<void> => {
  if (!req.user?.id) {
    throw new ApiError('Authentication required', undefined, 401);
  }

  const { hostId } = req.params;
  const logMeta: LogMetadata = { 
    userId: req.user.id, 
    hostId 
  };

  logger.info('Fetching packages for host', logMeta);

  try {
    const result = await query<PackageRow>(
      `
      SELECT
        name,
        version,
        description,
        installed,
        latest_version,
        size,
        dependencies,
        repository,
        license,
        homepage,
        metadata
      FROM packages
      WHERE host_id = $1
      ORDER BY
        name ASC
      `,
      [hostId]
    );

    const packages: Package[] = result.rows.map(row => ({
      name: row.name,
      version: row.version,
      description: row.description ?? undefined,
      installed: row.installed,
      updateAvailable: Boolean(row.latest_version && row.latest_version !== row.version),
      latestVersion: row.latest_version ?? undefined,
      size: row.size ?? undefined,
      dependencies: row.dependencies ?? undefined,
      repository: row.repository ?? undefined,
      license: row.license ?? undefined,
      homepage: row.homepage ?? undefined,
      metadata: row.metadata ?? undefined
    }));

    res.json({
      success: true,
      data: packages
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to list packages', { 
      ...logMeta, 
      error: errorMessage
    });
    throw new ApiError('Failed to list packages', error);
  }
};

export const installPackage = async (
  req: Request<PackageParams, ApiResponse<void>, InstallPackageDto>,
  res: Response<ApiResponse<void>>
): Promise<void> => {
  if (!req.user?.id) {
    throw new ApiError('Authentication required', undefined, 401);
  }

  const { hostId } = req.params;
  const { package: packageName } = req.body;

  const logMeta: LogMetadata = {
    userId: req.user.id,
    hostId,
    package: packageName,
  };

  logger.info('Installing package', logMeta);

  try {
    // Check if package exists
    const packageResult = await query<{ installed: boolean }>(
      'SELECT installed FROM packages WHERE host_id = $1 AND name = $2',
      [hostId, packageName]
    );

    if (packageResult.rows.length === 0) {
      throw new ApiError('Package not found', undefined, 404);
    }

    const installedStatus = packageResult.rows[0]?.installed;
    if (installedStatus) {
      throw new ApiError('Package already installed', undefined, 400);
    }

    // Update package status
    await query(
      'UPDATE packages SET installed = true WHERE host_id = $1 AND name = $2',
      [hostId, packageName]
    );

    res.json({
      success: true
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to install package', { 
      ...logMeta, 
      error: errorMessage
    });
    
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to install package', error);
  }
};
