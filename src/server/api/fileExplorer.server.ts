import { promises as fs, Dirent } from 'fs';
import path from 'path';
import os from 'os';
import type { Request, Response } from 'express';

import { createApiError } from '../../types/error';
import type { LogMetadata } from '../../types/logger';
import type { FileItem, ApiResponse } from '../../types/models-shared';
import { LoggingManager } from '../managers/LoggingManager';

const isWindows = os.platform() === 'win32';

interface FileRequestBody {
  path?: string;
  content?: string;
}

function validatePath(filePath: { path?: string }): string {
  if (!filePath.path) {
    throw new Error('Invalid file path');
  }
  return filePath.path;
}

function sanitizePath(inputPath: string): string {
  // Convert forward slashes to backslashes on Windows
  const normalizedPath = isWindows ? inputPath.replace(/\//g, '\\') : inputPath;
  
  // Normalize path and remove any ".." to prevent directory traversal
  const normalized = path.normalize(normalizedPath).replace(/^(\.\.[\\/])+/, '');
  
  // Use platform-specific root directory
  const rootDir = isWindows ? 'C:\\' : '/';
  return path.resolve(rootDir, normalized);
}

function validateFileContent(content: unknown): content is string {
  return typeof content === 'string' && content.length > 0;
}

function getQueryParam(query: unknown): string | undefined {
  if (query === undefined || query === null) {
    return undefined;
  }

  if (Array.isArray(query)) {
    const firstItem = query[0];
    return firstItem != null ? String(firstItem) : undefined;
  }

  if (typeof query === 'object' && query !== null) {
    const values = Object.values(query as Record<string, unknown>);
    if (values.length === 0) {
      return undefined;
    }
    const firstValue = values[0];
    return firstValue != null ? String(firstValue) : undefined;
  }

  return String(query);
}

async function getFileStats(filePath: string, entry: Dirent): Promise<FileItem> {
  const stats = await fs.stat(filePath);
  return {
    name: entry.name,
    path: filePath,
    type: entry.isDirectory() ? 'directory' : entry.isSymbolicLink() ? 'symlink' : 'file',
    size: stats.size,
    permissions: isWindows ? undefined : stats.mode & 0o777,
    modifiedTime: stats.mtime,
    owner: undefined, // Could be added using fs.stat on Unix systems
    group: undefined, // Could be added using fs.stat on Unix systems
    isHidden: entry.name.startsWith('.'),
  };
}

export async function listFiles(req: Request, res: Response): Promise<Response> {
  try {
    const queryPath = getQueryParam(req.query.path);
    if (!queryPath) {
      return res.status(400).json(createApiError('Invalid path parameter'));
    }

    const dirPath = sanitizePath(queryPath);
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    const items = await Promise.all(
      entries.map(entry => getFileStats(path.join(dirPath, entry.name), entry))
    );

    const response: ApiResponse<FileItem[]> = {
      success: true,
      data: items,
      meta: {
        total: items.length,
        path: dirPath
      }
    };

    return res.json(response);
  } catch (error) {
    const metadata: LogMetadata = {
      path: String(req.query.path),
      error: error instanceof Error ? error.message : String(error)
    };
    LoggingManager.getInstance().error('Failed to list files', metadata);
    return res.status(500).json(createApiError('Failed to list files', metadata));
  }
}

async function readFile(req: Request<unknown, unknown, FileRequestBody>, res: Response): Promise<Response> {
  try {
    const queryPath = getQueryParam(req.query.path);
    if (!queryPath) {
      return res.status(400).json(createApiError('Invalid path parameter'));
    }

    const sanitizedPath = sanitizePath(queryPath);
    const content = await fs.readFile(sanitizedPath, 'utf-8');
    const stats = await fs.stat(sanitizedPath);

    return res.json({
      success: true,
      data: {
        path: sanitizedPath,
        content,
        size: stats.size,
        modified: stats.mtime
      }
    });
  } catch (error) {
    const metadata: LogMetadata = {
      path: String(req.query.path),
      error: error instanceof Error ? error.message : String(error)
    };
    LoggingManager.getInstance().error('Failed to read file', metadata);
    return res.status(500).json(createApiError('Failed to read file', metadata));
  }
}

async function writeFile(req: Request<unknown, unknown, FileRequestBody>, res: Response): Promise<Response> {
  try {
    const { path: filePath, content } = req.body;
    const validatedPath = validatePath({ path: filePath });

    if (!validateFileContent(content)) {
      return res.status(400).json(createApiError('Invalid file content'));
    }

    const sanitizedPath = sanitizePath(validatedPath);
    await fs.writeFile(sanitizedPath, content, 'utf-8');

    const stats = await fs.stat(sanitizedPath);

    const response: ApiResponse<{ path: string; size: number; modified: Date }> = {
      success: true,
      data: {
        path: sanitizedPath,
        size: stats.size,
        modified: stats.mtime
      }
    };

    return res.json(response);
  } catch (error) {
    const metadata: LogMetadata = {
      path: String(req.body.path),
      error: error instanceof Error ? error.message : String(error)
    };
    LoggingManager.getInstance().error('Failed to write file', metadata);
    return res.status(500).json(createApiError('Failed to write file', metadata));
  }
}

async function deleteFile(req: Request<unknown, unknown, FileRequestBody>, res: Response): Promise<Response> {
  try {
    const queryPath = getQueryParam(req.query.path);
    if (!queryPath) {
      return res.status(400).json(createApiError('Invalid path parameter'));
    }

    const filePath = sanitizePath(queryPath);
    const stats = await fs.stat(filePath);

    if (stats.isDirectory()) {
      await fs.rmdir(filePath, { recursive: true });
    } else {
      await fs.unlink(filePath);
    }

    const response: ApiResponse<{ path: string; type: FileItem['type'] }> = {
      success: true,
      data: {
        path: filePath,
        type: stats.isDirectory() ? 'directory' : 'file'
      }
    };

    return res.json(response);
  } catch (error) {
    const metadata: LogMetadata = {
      path: String(req.query.path),
      error: error instanceof Error ? error.message : String(error)
    };
    LoggingManager.getInstance().error('Failed to delete file', metadata);
    return res.status(500).json(createApiError('Failed to delete file', metadata));
  }
}

async function createDirectory(req: Request<unknown, unknown, FileRequestBody>, res: Response): Promise<Response> {
  try {
    const { path: dirPath } = req.body;
    const validatedPath = validatePath({ path: dirPath });

    const sanitizedPath = sanitizePath(validatedPath);
    await fs.mkdir(sanitizedPath, { recursive: true });

    const stats = await fs.stat(sanitizedPath);

    const response: ApiResponse<{ path: string; created: Date }> = {
      success: true,
      data: {
        path: sanitizedPath,
        created: stats.birthtime
      }
    };

    return res.json(response);
  } catch (error) {
    const metadata: LogMetadata = {
      path: String(req.body.path),
      error: error instanceof Error ? error.message : String(error)
    };
    LoggingManager.getInstance().error('Failed to create directory', metadata);
    return res.status(500).json(createApiError('Failed to create directory', metadata));
  }
}

export const FileExplorerServer = {
  listFiles,
  readFile,
  writeFile,
  deleteFile,
  createDirectory
};
