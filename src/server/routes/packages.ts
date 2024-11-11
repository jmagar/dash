import { exec } from 'child_process';
import { promisify } from 'util';

import { Router } from 'express';

import type {
  Package,
} from '../../types/packages';
import { serverLogger as logger } from '../../utils/serverLogger';
import { redis, CACHE_KEYS, CACHE_TTL } from '../cache';
import { authenticateToken } from '../middleware/auth';

const execAsync = promisify(exec);
const router: Router = Router();

// Apply authentication middleware to all routes unless auth is disabled
if (process.env.DISABLE_AUTH !== 'true') {
  router.use(authenticateToken);
}

// List installed packages
router.get(
  '/:hostId',
  async (req, res) => {
    const { hostId } = req.params;

    try {
      // Check cache first
      const cachedPackages = await redis.get(
        `${CACHE_KEYS.PACKAGES}${hostId}`,
      );

      if (cachedPackages) {
        logger.info('Returning cached package list');
        return res.json({
          success: true,
          packages: JSON.parse(cachedPackages),
        });
      }

      // Get package list from system
      const { stdout } = await execAsync('dpkg-query -l');
      const packages: Package[] = stdout
        .split('\n')
        .slice(5) // Skip header lines
        .filter(Boolean)
        .map((line) => {
          const [status, name, version] = line.split(/\s+/);
          return {
            name,
            version,
            description: '',  // Description is optional in our updated type
            installed: status.startsWith('ii'),
          };
        });

      // Cache the result
      await redis.setex(
        `${CACHE_KEYS.PACKAGES}${hostId}`,
        CACHE_TTL.PACKAGES,
        JSON.stringify(packages),
      );

      res.json({
        success: true,
        packages,
      });
    } catch (error) {
      logger.error('Error listing packages:', {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to list packages',
      });
    }
  },
);

// Install package
router.post(
  '/:hostId/install',
  async (req, res) => {
    const { hostId } = req.params;
    const { packageName } = req.body;

    try {
      await execAsync(`apt-get install -y ${packageName}`);

      // Invalidate cache
      await redis.del(`${CACHE_KEYS.PACKAGES}${hostId}`);

      res.json({
        success: true,
        message: `Package ${packageName} installed successfully`,
      });
    } catch (error) {
      logger.error('Error installing package:', {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
      res.status(500).json({
        success: false,
        error: `Failed to install package: ${(error as Error).message}`,
      });
    }
  },
);

// Uninstall package
router.post(
  '/:hostId/uninstall',
  async (req, res) => {
    const { hostId } = req.params;
    const { packageName } = req.body;

    try {
      await execAsync(`apt-get remove -y ${packageName}`);

      // Invalidate cache
      await redis.del(`${CACHE_KEYS.PACKAGES}${hostId}`);

      res.json({
        success: true,
        message: `Package ${packageName} uninstalled successfully`,
      });
    } catch (error) {
      logger.error('Error uninstalling package:', {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
      res.status(500).json({
        success: false,
        error: `Failed to uninstall package: ${(error as Error).message}`,
      });
    }
  },
);

// Update package
router.post(
  '/:hostId/update',
  async (req, res) => {
    const { hostId } = req.params;
    const { packageName } = req.body;

    try {
      await execAsync(`apt-get upgrade -y ${packageName}`);

      // Invalidate cache
      await redis.del(`${CACHE_KEYS.PACKAGES}${hostId}`);

      res.json({
        success: true,
        message: `Package ${packageName} updated successfully`,
      });
    } catch (error) {
      logger.error('Error updating package:', {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
      res.status(500).json({
        success: false,
        error: `Failed to update package: ${(error as Error).message}`,
      });
    }
  },
);

// Update package list
router.post(
  '/:hostId/update-list',
  async (req, res) => {
    const { hostId } = req.params;

    try {
      await execAsync('apt-get update');

      // Invalidate cache
      await redis.del(`${CACHE_KEYS.PACKAGES}${hostId}`);

      res.json({
        success: true,
        message: 'Package list updated successfully',
      });
    } catch (error) {
      logger.error('Error updating package list:', {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
      res.status(500).json({
        success: false,
        error: `Failed to update package list: ${(error as Error).message}`,
      });
    }
  },
);

export default router;
