import { promises as fs } from 'fs';
import path from 'path';

import type { Request, Response } from 'express';

import { createApiError } from '../../types/error';
import type { LogMetadata } from '../../types/logger';
import type { FileItem, ApiResponse } from '../../types/models-shared';
import { logger } from '../utils/logger';

function validatePath(inputPath: unknown): inputPath is string {
  return typeof inputPath === 'string' && inputPath.trim().length > 0;
}

function sanitizePath(inputPath: string): string {
  // Normalize path and remove any ".." to prevent directory traversal
  const normalized = path.normalize(inputPath).replace(/^(\.\.[\\/])+/, '');
  return path.resolve('/', normalized);
}

function validateFileContent(content: unknown): content is string {
  return typeof content === 'string';
}

export async function listFiles(req: Request, res: Response): Promise<Response> {
  const rawPath = req.query.path;

  try {
    if (!validatePath(rawPath)) {
      const error = createApiError('Valid path is required', 400);
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    const dirPath = sanitizePath(rawPath);
    logger.info('Listing files', { path: dirPath });

    try {
      const stats = await fs.stat(dirPath);
      if (!stats.isDirectory()) {
        throw createApiError('Path is not a directory', 400);
      }
    } catch (err) {
      if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
        throw createApiError('Directory not found', 404);
      }
      throw err;
    }

    const files = await fs.readdir(dirPath, { withFileTypes: true });
    const fileList: FileItem[] = await Promise.all(
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
    const result: ApiResponse<FileItem[]> = {
      success: true,
      data: fileList,
    };
    return res.json(result);
  } catch (error) {
    const metadata: LogMetadata = {
      path: rawPath,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to list files:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to list files',
      error instanceof Error && error.message.includes('not found') ? 404 : 500,
      metadata,
    );
    return res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
}

export async function readFile(req: Request, res: Response): Promise<Response> {
  const rawPath = req.query.path;

  try {
    if (!validatePath(rawPath)) {
      const error = createApiError('Valid path is required', 400);
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    const filePath = sanitizePath(rawPath);
    logger.info('Reading file', { path: filePath });

    try {
      const stats = await fs.stat(filePath);
      if (stats.isDirectory()) {
        throw createApiError('Path is a directory', 400);
      }
    } catch (err) {
      if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
        throw createApiError('File not found', 404);
      }
      throw err;
    }

    const content = await fs.readFile(filePath, 'utf-8');
    logger.info('File read successfully', { path: filePath });

    const result: ApiResponse<string> = {
      success: true,
      data: content,
    };
    return res.json(result);
  } catch (error) {
    const metadata: LogMetadata = {
      path: rawPath,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to read file:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to read file',
      error instanceof Error && error.message.includes('not found') ? 404 : 500,
      metadata,
    );
    return res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
}

export async function writeFile(req: Request, res: Response): Promise<Response> {
  const { path: rawPath, content } = req.body;

  try {
    if (!validatePath(rawPath)) {
      throw createApiError('Valid path is required', 400);
    }

    if (!validateFileContent(content)) {
      throw createApiError('Valid content is required', 400);
    }

    const filePath = sanitizePath(rawPath);
    logger.info('Writing file', { path: filePath });

    // Ensure parent directory exists
    const parentDir = path.dirname(filePath);
    await fs.mkdir(parentDir, { recursive: true });

    await fs.writeFile(filePath, content, 'utf-8');
    logger.info('File written successfully', { path: filePath });

    const result: ApiResponse<void> = {
      success: true,
    };
    return res.json(result);
  } catch (error) {
    const metadata: LogMetadata = {
      path: rawPath,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to write file:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to write file',
      error instanceof Error && error.message.includes('required') ? 400 : 500,
      metadata,
    );
    return res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
}

export async function deleteFile(req: Request, res: Response): Promise<Response> {
  const rawPath = req.query.path;

  try {
    if (!validatePath(rawPath)) {
      throw createApiError('Valid path is required', 400);
    }

    const filePath = sanitizePath(rawPath);
    logger.info('Deleting file/directory', { path: filePath });

    try {
      const stats = await fs.stat(filePath);
      if (stats.isDirectory()) {
        await fs.rmdir(filePath);
        logger.info('Directory deleted successfully', { path: filePath });
      } else {
        await fs.unlink(filePath);
        logger.info('File deleted successfully', { path: filePath });
      }
    } catch (err) {
      if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
        throw createApiError('File or directory not found', 404);
      }
      throw err;
    }

    const result: ApiResponse<void> = {
      success: true,
    };
    return res.json(result);
  } catch (error) {
    const metadata: LogMetadata = {
      path: rawPath,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to delete file/directory:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to delete file/directory',
      error instanceof Error &&
        (error.message.includes('not found') || error.message.includes('required'))
        ? error.message.includes('required') ? 400 : 404
        : 500,
      metadata,
    );
    return res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
}

export async function createDirectory(req: Request, res: Response): Promise<Response> {
  const rawPath = req.body.path;

  try {
    if (!validatePath(rawPath)) {
      throw createApiError('Valid path is required', 400);
    }

    const dirPath = sanitizePath(rawPath);
    logger.info('Creating directory', { path: dirPath });

    try {
      await fs.mkdir(dirPath, { recursive: true });
      logger.info('Directory created successfully', { path: dirPath });
    } catch (err) {
      if (err instanceof Error && 'code' in err && err.code === 'EEXIST') {
        throw createApiError('Directory already exists', 409);
      }
      throw err;
    }

    const result: ApiResponse<void> = {
      success: true,
    };
    return res.json(result);
  } catch (error) {
    const metadata: LogMetadata = {
      path: rawPath,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to create directory:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to create directory',
      error instanceof Error &&
        (error.message.includes('exists') || error.message.includes('required'))
        ? error.message.includes('required') ? 400 : 409
        : 500,
      metadata,
    );
    return res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
}
