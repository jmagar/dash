import { createRouter, logRouteAccess } from '../routeUtils';
import path from 'path';

import { createAuthHandler } from '../../../types/express';
import { ApiError } from '../../../types/error';
import type { LogMetadata } from '../../../types/logger';
import { query } from '../../db';

export const router = createRouter();

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
const listFiles = async (req, res) => {
  const { hostId } = req.params;
  const normalizedPath = normalizePath(req.query.path as string);

  try {
    logRouteAccess('Listing directory', { hostId: String(hostId), path: normalizedPath });

    // This is a placeholder. In a real implementation, this would
    // connect to the host and list files.
    const result = await query('SELECT 1');
    if (!result) {
      const metadata: LogMetadata = {
        hostId: String(hostId),
        path: normalizedPath,
      };
      logRouteAccess('Database connection failed:', metadata);
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

    logRouteAccess('Directory listed successfully', {
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
    logRouteAccess('Failed to list directory:', metadata);

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
