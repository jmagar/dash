import type { ApiResponse } from '../../types/express';
import type { FileItem } from '../../types/models-shared';
import { api } from './api';
import { createApiError } from '../../types/error';
import { logger } from '../utils/frontendLogger';

const FILE_ENDPOINTS = {
  LIST: (hostId: string) => `/files/${hostId}/list`,
  READ: (hostId: string) => `/files/${hostId}/read`,
  WRITE: (hostId: string) => `/files/${hostId}/write`,
  DELETE: (hostId: string) => `/files/${hostId}/delete`,
  RENAME: (hostId: string) => `/files/${hostId}/rename`,
  MKDIR: (hostId: string) => `/files/${hostId}/mkdir`,
  SEARCH: (hostId: string) => `/files/${hostId}/search`,
} as const;

export async function listFiles(hostId: string, path: string): Promise<FileItem[]> {
  try {
    const response = await api.get<{ data: FileItem[] }>(FILE_ENDPOINTS.LIST(hostId), {
      params: { path },
    });

    return response.data.data;
  } catch (error) {
    logger.error('Failed to list files:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      hostId,
      path,
    });
    throw createApiError('Failed to list files', error);
  }
}

export async function readFile(hostId: string, path: string): Promise<string> {
  try {
    const response = await api.get<{ data: string }>(FILE_ENDPOINTS.READ(hostId), {
      params: { path },
    });

    return response.data.data;
  } catch (error) {
    logger.error('Failed to read file:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      hostId,
      path,
    });
    throw createApiError('Failed to read file', error);
  }
}

export async function writeFile(hostId: string, path: string, content: string): Promise<void> {
  try {
    await api.post(FILE_ENDPOINTS.WRITE(hostId), {
      path,
      content,
    });
  } catch (error) {
    logger.error('Failed to write file:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      hostId,
      path,
    });
    throw createApiError('Failed to write file', error);
  }
}

export async function deleteFile(hostId: string, path: string): Promise<void> {
  try {
    await api.delete(FILE_ENDPOINTS.DELETE(hostId), {
      params: { path },
    });
  } catch (error) {
    logger.error('Failed to delete file:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      hostId,
      path,
    });
    throw createApiError('Failed to delete file', error);
  }
}

export async function renameFile(hostId: string, oldPath: string, newPath: string): Promise<void> {
  try {
    await api.post(FILE_ENDPOINTS.RENAME(hostId), {
      oldPath,
      newPath,
    });
  } catch (error) {
    logger.error('Failed to rename file:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      hostId,
      oldPath,
      newPath,
    });
    throw createApiError('Failed to rename file', error);
  }
}

export async function createDirectory(hostId: string, path: string): Promise<void> {
  try {
    await api.post(FILE_ENDPOINTS.MKDIR(hostId), {
      path,
    });
  } catch (error) {
    logger.error('Failed to create directory:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      hostId,
      path,
    });
    throw createApiError('Failed to create directory', error);
  }
}

export async function searchFiles(hostId: string, query: string): Promise<FileItem[]> {
  try {
    const response = await api.get<{ data: FileItem[] }>(FILE_ENDPOINTS.SEARCH(hostId), {
      params: { query },
    });

    return response.data.data;
  } catch (error) {
    logger.error('Failed to search files:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      hostId,
      query,
    });
    throw createApiError('Failed to search files', error);
  }
}
