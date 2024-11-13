import express, { RequestHandler } from 'express';

import { createApiError } from '../../types/error';
import type { LogMetadata } from '../../types/logger';
import { cacheService } from '../cache/CacheService';
import { db } from '../db';
import { logger } from '../utils/logger';

const router = express.Router();

interface StatusResponse {
  success: boolean;
  status: {
    database: {
      connected: boolean;
      error?: string;
    };
    cache: {
      connected: boolean;
      error?: string;
    };
    uptime: number;
    memory: NodeJS.MemoryUsage;
  };
}

const getStatus: RequestHandler<unknown, StatusResponse> = async (req, res) => {
  try {
    logger.info('Checking system status');

    // Check database connection
    const dbHealth = await db.healthCheck();
    if (!dbHealth.connected) {
      const metadata: LogMetadata = {
        error: dbHealth.error,
      };
      logger.error('Database connection failed:', metadata);
      throw createApiError(`Database connection failed: ${dbHealth.error}`, 500, metadata);
    }

    // Check cache connection
    const cacheHealth = await cacheService.healthCheck();
    if (!cacheHealth.connected) {
      const metadata: LogMetadata = {
        error: cacheHealth.error,
      };
      logger.error('Cache connection failed:', metadata);
      throw createApiError(`Cache connection failed: ${cacheHealth.error}`, 500, metadata);
    }

    // Get system metrics
    const uptime = process.uptime();
    const memory = process.memoryUsage();

    const status = {
      database: {
        connected: dbHealth.connected,
        error: dbHealth.error,
      },
      cache: {
        connected: cacheHealth.connected,
        error: cacheHealth.error,
      },
      uptime,
      memory,
    };

    logger.info('System status check completed', status);

    res.json({
      success: true,
      status,
    });
  } catch (error) {
    const metadata: LogMetadata = {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to get system status:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to get system status',
      500,
      metadata,
    );
    res.status(apiError.status || 500).json({
      success: false,
      status: {
        database: {
          connected: false,
          error: 'Failed to check database status',
        },
        cache: {
          connected: false,
          error: 'Failed to check cache status',
        },
        uptime: 0,
        memory: process.memoryUsage(),
      },
    });
  }
};

router.get('/', getStatus);

export default router;
