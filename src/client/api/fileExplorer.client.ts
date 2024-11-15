import { api } from './api';
import { createApiError } from '../../types/error';
import type { FileItem } from '../../types/models-shared';
import { logger } from '../utils/frontendLogger';

const FILE_ENDPOINTS = {
  LIST: (hostId: number) => `/files/${hostId}/list`,
  READ: (hostId: number) => `/files/${hostId}/read`,
  WRITE: (hostId: number) => `/files/${hostId}/write`,
  DELETE: (hostId: number) => `/files/${hostId}/delete`,
  RENAME: (hostId: number) => `/files/${hostId}/rename`,
  MKDIR: (hostId: number) => `/files/${hostId}/mkdir`,
  SEARCH: (hostId: number) => `/files/${hostId}/search`,
} as const;

export async function listFiles(hostId: number, path: string): Promise<FileItem[]> {
  try {
    const response = await api.get<{ data: FileItem[] }>(FILE_ENDPOINTS.LIST(hostId), {
      params: { path },
    });
    return response.data.data;
  } catch (error) {
    logger.error('Failed to list files:', {
      hostId,
      path,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to list files', error);
  }
}

export async function readFile(hostId: number, path: string): Promise<string> {
  try {
    const response = await api.get<{ data: string }>(FILE_ENDPOINTS.READ(hostId), {
      params: { path },
    });
    return response.data.data;
  } catch (error) {
    logger.error('Failed to read file:', {
      hostId,
      path,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to read file', error);
  }
}

export async function writeFile(hostId: number, path: string, content: string): Promise<void> {
  try {
    await api.post(FILE_ENDPOINTS.WRITE(hostId), { path, content });
  } catch (error) {
    logger.error('Failed to write file:', {
      hostId,
      path,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to write file', error);
  }
}

export async function deleteFile(hostId: number, path: string): Promise<void> {
  try {
    await api.delete(FILE_ENDPOINTS.DELETE(hostId), { data: { path } });
  } catch (error) {
    logger.error('Failed to delete file:', {
      hostId,
      path,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to delete file', error);
  }
}

export async function renameFile(hostId: number, oldPath: string, newPath: string): Promise<void> {
  try {
    await api.post(FILE_ENDPOINTS.RENAME(hostId), { oldPath, newPath });
  } catch (error) {
    logger.error('Failed to rename file:', {
      hostId,
      oldPath,
      newPath,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to rename file', error);
  }
}

export async function createDirectory(hostId: number, path: string): Promise<void> {
  try {
    await api.post(FILE_ENDPOINTS.MKDIR(hostId), { path });
  } catch (error) {
    logger.error('Failed to create directory:', {
      hostId,
      path,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to create directory', error);
  }
}

export async function searchFiles(hostId: number, query: string): Promise<FileItem[]> {
  try {
    const response = await api.get<{ data: FileItem[] }>(FILE_ENDPOINTS.SEARCH(hostId), {
      params: { query },
    });
    return response.data.data;
  } catch (error) {
    logger.error('Failed to search files:', {
      hostId,
      query,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to search files', error);
  }
}
