import path from 'path';

import express from 'express';

import { createApiError } from '../../types/error';
import type { LogMetadata } from '../../types/logger';
import { query } from '../db';
import { logger } from '../utils/logger';

const router = express.Router();

// Request params interface
interface _FileRequestParams {
  hostId: string;
  path?: string;
}

// Normalize file path to prevent directory traversal
function normalizePath(filePath?: string): string {
  if (!filePath) return '/';
  const normalized = path.normalize(filePath).replace(/^(\.\.[/\\])+/, '');
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

// List files in directory
const listFiles = async (req: express.Request, res: express.Response): Promise<void> => {
  const { hostId } = req.params;
  const normalizedPath = normalizePath(req.query.path as string);

  try {
    logger.info('Listing directory', { hostId: String(hostId), path: normalizedPath });

    // This is a placeholder. In a real implementation, this would
    // connect to the host and list files.
    const result = await query('SELECT 1');
    if (!result) {
      const metadata: LogMetadata = {
        hostId: String(hostId),
        path: normalizedPath,
      };
      logger.error('Database connection failed:', metadata);
      throw createApiError('Failed to connect to database', 500, metadata);
    }

    const files = [
      {
        name: 'example.txt',
        path: normalizedPath + '/example.txt',
        type: 'file',
        size: 1024,
        modified: new Date(),
      },
    ];

    logger.info('Directory listed successfully', {
      hostId: String(hostId),
      path: normalizedPath,
      count: files.length,
    });
    res.json({
      success: true,
      data: files,
    });
  } catch (error) {
    const metadata: LogMetadata = {
      hostId: String(hostId),
      path: normalizedPath,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to list directory:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to list directory',
      500,
      metadata,
    );
    res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
};

// Register routes
router.get('/:hostId', listFiles);

export default router;
