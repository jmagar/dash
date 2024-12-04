import { Request, Response } from 'express';
import path from 'path';
import { ApiError } from '../../utils/error';
import { ApiResponse } from '../../types/express';
import { logger } from '../../utils/logger';
import { query } from '../../db';
import { FileParams } from './dto/files.dto';
import { LoggingManager } from '../../managers/utils/LoggingManager';

// Normalize file path to prevent directory traversal
function normalizePath(filePath?: string): string {
  if (!filePath) return '/';
  const normalized = path.normalize(filePath).replace(/\\/g, '/');
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

export const listFiles = async (
  req: Request<FileParams>,
  res: Response
): Promise<void> => {
  const { hostId } = req.params;
  const requestPath = normalizePath(req.params.path);
  
  const logMeta = {
    userId: req.user!.id,
    hostId,
    path: requestPath,
  };

  loggerLoggingManager.getInstance().();

  try {
    const result = await query(
      `
      SELECT
        name,
        path,
        type,
        size,
        modified
      FROM files
      WHERE
        host_id = $1
        AND path LIKE $2 || '%'
        AND path NOT LIKE $2 || '%/%'
      ORDER BY
        type DESC,
        name ASC
      `,
      [hostId, requestPath]
    );

    const files = result.rows.map(row => ({
      name: row.name,
      path: row.path,
      type: row.type,
      size: parseInt(row.size),
      modified: row.modified,
    }));

    res.json(new ApiResponse({
      path: requestPath,
      files,
    }));
  } catch (error) {
    loggerLoggingManager.getInstance().();
    throw new ApiError(500, 'Failed to list files');
  }
};


