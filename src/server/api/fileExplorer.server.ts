import fs from 'fs/promises';
import path from 'path';

import { Request, Response } from 'express';

import type { ApiResult } from '../../types/api-shared';
import { handleApiError } from '../../types/error';
import type { FileItem } from '../../types/models-shared';
import { serverLogger as logger } from '../utils/serverLogger';

export async function listFiles(req: Request, res: Response): Promise<void> {
  const { path: dirPath } = req.query;

  try {
    logger.info('Listing files', { path: dirPath });
    const files = await fs.readdir(dirPath as string, { withFileTypes: true });
    const fileList: FileItem[] = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(dirPath as string, file.name);
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

    const result: ApiResult<FileItem[]> = {
      success: true,
      data: fileList,
    };

    logger.info('Files listed successfully', { count: fileList.length });
    res.json(result);
  } catch (error) {
    const errorResult = handleApiError<FileItem[]>(error, 'listFiles');
    res.status(500).json(errorResult);
  }
}

export async function readFile(req: Request, res: Response): Promise<void> {
  const { path: filePath } = req.query;

  try {
    logger.info('Reading file', { path: filePath });
    const content = await fs.readFile(filePath as string, 'utf-8');
    const result: ApiResult<string> = {
      success: true,
      data: content,
    };

    logger.info('File read successfully', { path: filePath });
    res.json(result);
  } catch (error) {
    const errorResult = handleApiError<string>(error, 'readFile');
    res.status(500).json(errorResult);
  }
}

export async function writeFile(req: Request, res: Response): Promise<void> {
  const { path: filePath, content } = req.body;

  try {
    logger.info('Writing file', { path: filePath });
    await fs.writeFile(filePath, content, 'utf-8');
    const result: ApiResult<void> = {
      success: true,
    };

    logger.info('File written successfully', { path: filePath });
    res.json(result);
  } catch (error) {
    const errorResult = handleApiError(error, 'writeFile');
    res.status(500).json(errorResult);
  }
}

export async function deleteFile(req: Request, res: Response): Promise<void> {
  const { path: filePath } = req.query;

  try {
    logger.info('Deleting file/directory', { path: filePath });
    const stats = await fs.stat(filePath as string);
    if (stats.isDirectory()) {
      await fs.rmdir(filePath as string);
      logger.info('Directory deleted successfully', { path: filePath });
    } else {
      await fs.unlink(filePath as string);
      logger.info('File deleted successfully', { path: filePath });
    }

    const result: ApiResult<void> = {
      success: true,
    };

    res.json(result);
  } catch (error) {
    const errorResult = handleApiError(error, 'deleteFile');
    res.status(500).json(errorResult);
  }
}

export async function createDirectory(req: Request, res: Response): Promise<void> {
  const { path: dirPath } = req.body;

  try {
    logger.info('Creating directory', { path: dirPath });
    await fs.mkdir(dirPath, { recursive: true });
    const result: ApiResult<void> = {
      success: true,
    };

    logger.info('Directory created successfully', { path: dirPath });
    res.json(result);
  } catch (error) {
    const errorResult = handleApiError(error, 'createDirectory');
    res.status(500).json(errorResult);
  }
}
