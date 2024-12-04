import path from 'path';

import { createAuthHandler, type AuthenticatedRequestHandler } from '../../types/express';
import express from 'express';

import { ApiError } from '../../types/error';
import type { LogMetadata } from '../../types/logger';
import { query } from '../db';
import { LoggingManager } from '../managers/utils/LoggingManager';

const router = express.Router();

// Request params interface
interface FileParams {
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
const listFiles: AuthenticatedRequestHandler<FileParams> = async (req, res) => {
  const { hostId } = req.params;
  const normalizedPath = normalizePath(req.query.path as string);

  try {
    LoggingManager.getInstance().info('Listing directory', { hostId: String(hostId), path: normalizedPath });

    // This is a placeholder. In a real implementation, this would
    // connect to the host and list files.
    const result = await query('SELECT 1');
    if (!result) {
      const metadata: LogMetadata = {
        hostId: String(hostId),
        path: normalizedPath,
      };
      LoggingManager.getInstance().error('Database connection failed:', metadata);
      throw new ApiError('Failed to connect to database', undefined, 500, metadata);
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

    LoggingManager.getInstance().info('Directory listed successfully', {
      hostId: String(hostId),
      path: normalizedPath,
      count: files.length,
    });
    return res.json({
      success: true,
      data: files,
    });
  } catch (error) {
    const metadata: LogMetadata = {
      hostId: String(hostId),
      path: normalizedPath,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    LoggingManager.getInstance().error('Failed to list directory:', metadata);

    if (error instanceof ApiError) {
      return res.status(error.status).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to list directory',
    });
  }
};

// Register routes
router.get('/:hostId', createAuthHandler(listFiles));

export default router;


