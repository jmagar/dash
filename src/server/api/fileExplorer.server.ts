import fs from 'fs/promises';
import path from 'path';

import { Request, Response } from 'express';

import type { ApiResult } from '../../types/api-shared';
import type { FileItem } from '../../types/models-shared';
import { handleApiError } from '../../utils/error';

export async function listFiles(req: Request, res: Response): Promise<void> {
  const { path: dirPath } = req.query;

  try {
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

    res.json(result);
  } catch (error) {
    const errorResult = handleApiError<FileItem[]>(error);
    res.status(500).json(errorResult);
  }
}

export async function readFile(req: Request, res: Response): Promise<void> {
  const { path: filePath } = req.query;

  try {
    const content = await fs.readFile(filePath as string, 'utf-8');
    const result: ApiResult<string> = {
      success: true,
      data: content,
    };

    res.json(result);
  } catch (error) {
    const errorResult = handleApiError<string>(error);
    res.status(500).json(errorResult);
  }
}

export async function writeFile(req: Request, res: Response): Promise<void> {
  const { path: filePath, content } = req.body;

  try {
    await fs.writeFile(filePath, content, 'utf-8');
    const result: ApiResult<void> = {
      success: true,
    };

    res.json(result);
  } catch (error) {
    const errorResult = handleApiError(error);
    res.status(500).json(errorResult);
  }
}

export async function deleteFile(req: Request, res: Response): Promise<void> {
  const { path: filePath } = req.query;

  try {
    const stats = await fs.stat(filePath as string);
    if (stats.isDirectory()) {
      await fs.rmdir(filePath as string);
    } else {
      await fs.unlink(filePath as string);
    }

    const result: ApiResult<void> = {
      success: true,
    };

    res.json(result);
  } catch (error) {
    const errorResult = handleApiError(error);
    res.status(500).json(errorResult);
  }
}

export async function createDirectory(req: Request, res: Response): Promise<void> {
  const { path: dirPath } = req.body;

  try {
    await fs.mkdir(dirPath, { recursive: true });
    const result: ApiResult<void> = {
      success: true,
    };

    res.json(result);
  } catch (error) {
    const errorResult = handleApiError(error);
    res.status(500).json(errorResult);
  }
}
