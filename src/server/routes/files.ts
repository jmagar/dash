import path from 'path';

import express from 'express';

import { createApiError } from '../../types/error';
import type { LogMetadata } from '../../types/logger';
import { query } from '../db';
import { logger } from '../utils/logger';

const router = express.Router();

interface FileRequestParams {
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

// Download file
const downloadFile = async (req: express.Request, res: express.Response): Promise<void> => {
  const { hostId } = req.params;
  const filePath = req.query.path as string;

  if (!filePath) {
    const metadata: LogMetadata = { hostId: String(hostId) };
    logger.warn('No file path provided', metadata);
    res.status(400).json({
      success: false,
      error: 'File path is required',
    });
    return;
  }

  const normalizedPath = normalizePath(filePath);

  try {
    logger.info('Downloading file', { hostId: String(hostId), path: normalizedPath });

    // This is a placeholder. In a real implementation, this would
    // connect to the host and download the file.
    const result = await query('SELECT 1');
    if (!result) {
      const metadata: LogMetadata = {
        hostId: String(hostId),
        path: normalizedPath,
      };
      logger.error('Database connection failed:', metadata);
      throw createApiError('Failed to connect to database', 500, metadata);
    }

    const fileContent = 'Example file content';

    logger.info('File downloaded successfully', {
      hostId: String(hostId),
      path: normalizedPath,
      size: fileContent.length,
    });
    res.send(fileContent);
  } catch (error) {
    const metadata: LogMetadata = {
      hostId: String(hostId),
      path: normalizedPath,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to download file:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to download file',
      500,
      metadata,
    );
    res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
};

// Upload file
const uploadFile = async (req: express.Request, res: express.Response): Promise<void> => {
  const { hostId } = req.params;
  const { path: filePath, content } = req.body;

  if (!filePath) {
    const metadata: LogMetadata = { hostId: String(hostId) };
    logger.warn('No path provided', metadata);
    res.status(400).json({
      success: false,
      error: 'Path is required',
    });
    return;
  }

  const normalizedPath = normalizePath(filePath);

  try {
    logger.info('Uploading file', { hostId: String(hostId), path: normalizedPath });

    // This is a placeholder. In a real implementation, this would
    // connect to the host and upload the file.
    const result = await query('SELECT 1');
    if (!result) {
      const metadata: LogMetadata = {
        hostId: String(hostId),
        path: normalizedPath,
      };
      logger.error('Database connection failed:', metadata);
      throw createApiError('Failed to connect to database', 500, metadata);
    }

    logger.info('File uploaded successfully', {
      hostId: String(hostId),
      path: normalizedPath,
      size: content?.length || 0,
    });
    res.json({ success: true });
  } catch (error) {
    const metadata: LogMetadata = {
      hostId: String(hostId),
      path: normalizedPath,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to upload file:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to upload file',
      500,
      metadata,
    );
    res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
};

// Delete file
const deleteFile = async (req: express.Request, res: express.Response): Promise<void> => {
  const { hostId } = req.params;
  const filePath = req.query.path as string;

  if (!filePath) {
    const metadata: LogMetadata = { hostId: String(hostId) };
    logger.warn('No path provided', metadata);
    res.status(400).json({
      success: false,
      error: 'Path is required',
    });
    return;
  }

  const normalizedPath = normalizePath(filePath);

  try {
    logger.info('Deleting file/directory', { hostId: String(hostId), path: normalizedPath });

    // This is a placeholder. In a real implementation, this would
    // connect to the host and delete the file.
    const result = await query('SELECT 1');
    if (!result) {
      const metadata: LogMetadata = {
        hostId: String(hostId),
        path: normalizedPath,
      };
      logger.error('Database connection failed:', metadata);
      throw createApiError('Failed to connect to database', 500, metadata);
    }

    logger.info('File/directory deleted successfully', {
      hostId: String(hostId),
      path: normalizedPath,
    });
    res.json({ success: true });
  } catch (error) {
    const metadata: LogMetadata = {
      hostId: String(hostId),
      path: normalizedPath,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to delete file/directory:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to delete file/directory',
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
router.get('/:hostId/download', downloadFile);
router.post('/:hostId/upload', uploadFile);
router.delete('/:hostId', deleteFile);

export default router;
