import { Request, Response } from 'express';
import { ApiError } from '../../utils/error';
import { ApiResponse } from '../../types/express';
import { logger } from '../../utils/logger';
import { query } from '../../db';
import { PackageParams, InstallPackageDto } from './dto/packages.dto';
import { Package } from '../../types/models-shared';

export const listPackages = async (
  req: Request<PackageParams>,
  res: Response
): Promise<void> => {
  const { hostId } = req.params;
  const logMeta = { userId: req.user!.id, hostId };

  logger.info('Listing packages', logMeta);

  try {
    const result = await query(
      `
      SELECT
        name,
        version,
        description,
        installed
      FROM packages
      WHERE host_id = $1
      ORDER BY
        name ASC
      `,
      [hostId]
    );

    const packages = result.rows.map(row => ({
      name: row.name,
      version: row.version,
      description: row.description,
      installed: row.installed,
    }));

    res.json(new ApiResponse(packages));
  } catch (error) {
    logger.error('Error listing packages:', error, logMeta);
    throw new ApiError(500, 'Failed to list packages');
  }
};

export const installPackage = async (
  req: Request<PackageParams, any, InstallPackageDto>,
  res: Response
): Promise<void> => {
  const { hostId } = req.params;
  const { package: packageName } = req.body;

  const logMeta = {
    userId: req.user!.id,
    hostId,
    package: packageName,
  };

  logger.info('Installing package', logMeta);

  try {
    // Check if package exists
    const packageResult = await query(
      'SELECT installed FROM packages WHERE host_id = $1 AND name = $2',
      [hostId, packageName]
    );

    if (packageResult.rows.length === 0) {
      throw new ApiError(404, 'Package not found');
    }

    if (packageResult.rows[0].installed) {
      throw new ApiError(400, 'Package already installed');
    }

    // Update package status
    await query(
      'UPDATE packages SET installed = true WHERE host_id = $1 AND name = $2',
      [hostId, packageName]
    );

    res.json(new ApiResponse(undefined));
  } catch (error) {
    logger.error('Error installing package:', error, logMeta);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to install package');
  }
};
