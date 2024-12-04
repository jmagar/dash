import { Request, Response } from 'express';
import path from 'path';
import { createApiError } from '../../utils/error';
import { query } from '../../db';
import { FileParams } from './dto/files.dto';
import { LoggingManager } from '../../managers/LoggingManager';

interface FileRow {
  name: string;
  path: string;
  type: string;
  size: string;
  modified: Date;
}

interface FileResponse {
  name: string;
  path: string;
  type: string;
  size: number;
  modified: Date;
}

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

  const logger = LoggingManager.getInstance();
  logger.info('Listing files', logMeta);

  try {
    const result = await query<FileRow>(
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

    const files: FileResponse[] = result.rows.map(row => ({
      name: row.name,
      path: row.path,
      type: row.type,
      size: parseInt(row.size, 10),
      modified: row.modified,
    }));

    res.json({ 
      success: true, 
      data: {
        path: requestPath,
        files,
      }
    });
  } catch (error) {
    logger.error('Failed to list files', {
      ...logMeta,
      error: error instanceof Error ? error.message : String(error)
    });
    throw createApiError('Failed to list files', 500, logMeta);
  }
};
