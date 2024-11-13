import { promises as fs } from 'fs';
import path from 'path';

import type { Request, Response } from 'express-serve-static-core';

import { createApiError } from '../../types/error';
import type { LogMetadata } from '../../types/logger';
import { logger } from '../utils/logger';

interface FileInfo {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: Date;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function listFiles(req: Request, res: Response): Promise<void> {
  const dirPath = req.query.path as string;

  try {
    if (!dirPath) {
      const error = createApiError('Path is required', 400);
      res.status(400).json({
        success: false,
        error: error.message,
      });
      return;
    }

    logger.info('Listing files', { path: dirPath });
    const files = await fs.readdir(dirPath, { withFileTypes: true });

    const fileList: FileInfo[] = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(dirPath, file.name);
        const stats = await fs.stat(filePath);
        return {
          name: file.name,
          path: filePath,
          type: file.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          modified: stats.mtime,
        };
      }),
    );

    logger.info('Files listed successfully', { count: fileList.length });
    const result: ApiResponse<FileInfo[]> = {
      success: true,
      data: fileList,
    };
    res.json(result);
  } catch (error) {
    const metadata: LogMetadata = {
      path: dirPath,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to list files:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to list files',
      500,
      metadata,
    );
    res.status(500).json({
      success: false,
      error: apiError.message,
    });
  }
}

export async function readFile(req: Request, res: Response): Promise<void> {
  const filePath = req.query.path as string;

  try {
    if (!filePath) {
      const error = createApiError('Path is required', 400);
      res.status(400).json({
        success: false,
        error: error.message,
      });
      return;
    }

    logger.info('Reading file', { path: filePath });
    const content = await fs.readFile(filePath, 'utf-8');

    logger.info('File read successfully', { path: filePath });
    const result: ApiResponse<string> = {
      success: true,
      data: content,
    };
    res.json(result);
  } catch (error) {
    const metadata: LogMetadata = {
      path: filePath,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to read file:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to read file',
      500,
      metadata,
    );
    res.status(500).json({
      success: false,
      error: apiError.message,
    });
  }
}

export async function writeFile(req: Request, res: Response): Promise<void> {
  const { path: filePath, content } = req.body;

  try {
    if (!filePath || content === undefined) {
      const error = createApiError('Path and content are required', 400);
      res.status(400).json({
        success: false,
        error: error.message,
      });
      return;
    }

    logger.info('Writing file', { path: filePath });
    await fs.writeFile(filePath, content, 'utf-8');

    logger.info('File written successfully', { path: filePath });
    const result: ApiResponse<void> = {
      success: true,
    };
    res.json(result);
  } catch (error) {
    const metadata: LogMetadata = {
      path: filePath,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to write file:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to write file',
      500,
      metadata,
    );
    res.status(500).json({
      success: false,
      error: apiError.message,
    });
  }
}

export async function deleteFile(req: Request, res: Response): Promise<void> {
  const filePath = req.query.path as string;

  try {
    if (!filePath) {
      const error = createApiError('Path is required', 400);
      res.status(400).json({
        success: false,
        error: error.message,
      });
      return;
    }

    logger.info('Deleting file/directory', { path: filePath });
    const stats = await fs.stat(filePath);

    if (stats.isDirectory()) {
      await fs.rmdir(filePath);
      logger.info('Directory deleted successfully', { path: filePath });
    } else {
      await fs.unlink(filePath);
      logger.info('File deleted successfully', { path: filePath });
    }

    const result: ApiResponse<void> = {
      success: true,
    };
    res.json(result);
  } catch (error) {
    const metadata: LogMetadata = {
      path: filePath,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to delete file/directory:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to delete file/directory',
      500,
      metadata,
    );
    res.status(500).json({
      success: false,
      error: apiError.message,
    });
  }
}

export async function createDirectory(req: Request, res: Response): Promise<void> {
  const dirPath = req.body.path as string;

  try {
    if (!dirPath) {
      const error = createApiError('Path is required', 400);
      res.status(400).json({
        success: false,
        error: error.message,
      });
      return;
    }

    logger.info('Creating directory', { path: dirPath });
    await fs.mkdir(dirPath, { recursive: true });

    logger.info('Directory created successfully', { path: dirPath });
    const result: ApiResponse<void> = {
      success: true,
    };
    res.json(result);
  } catch (error) {
    const metadata: LogMetadata = {
      path: dirPath,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to create directory:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to create directory',
      500,
      metadata,
    );
    res.status(500).json({
      success: false,
      error: apiError.message,
    });
  }
}
