import express from 'express';

import { ApiError } from '../../types/error';
import { type RequestHandler } from '../../types/express';
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
      throw new ApiError(`Database connection failed: ${dbHealth.error}`, undefined, 500, metadata);
    }

    // Check cache connection
    const cacheHealth = await cacheService.healthCheck();
    if (!cacheHealth.connected) {
      const metadata: LogMetadata = {
        error: cacheHealth.error,
      };
      logger.error('Cache connection failed:', metadata);
      throw new ApiError(`Cache connection failed: ${cacheHealth.error}`, undefined, 500, metadata);
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

    return res.json({
      success: true,
      status,
    });
  } catch (error) {
    const metadata: LogMetadata = {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to get system status:', metadata);

    const apiError = new ApiError(
      error instanceof Error ? error.message : 'Failed to get system status',
      undefined,
      500,
      metadata
    );
    return res.status(apiError.status).json({
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
