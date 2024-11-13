import axios from 'axios';

import type { FileItem, ApiResult } from '../../types';
import { API_ENDPOINTS } from '../../types/api-shared';
import { handleApiError } from '../../types/error';
import { BASE_URL } from '../config';
import { logger } from '../utils/frontendLogger';

// Configure axios
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    logger.error('File Explorer API request failed:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      error: error.message,
      response: error.response?.data,
    });
    return Promise.reject(error);
  },
);

export async function listFiles(hostId: number, path?: string): Promise<ApiResult<FileItem[]>> {
  try {
    logger.info('Listing files', { hostId: hostId.toString(), path });
    const response = await api.get(API_ENDPOINTS.FILES.LIST(hostId), {
      params: { path },
    });
    logger.info('Files listed successfully', {
      hostId: hostId.toString(),
      path,
      count: response.data?.data?.length,
    });
    return response.data;
  } catch (error) {
    return handleApiError<FileItem[]>(error, 'listFiles');
  }
}

export async function readFile(hostId: number, path: string): Promise<ApiResult<string>> {
  try {
    logger.info('Reading file', { hostId: hostId.toString(), path });
    const response = await api.get(API_ENDPOINTS.FILES.DOWNLOAD(hostId), {
      params: { path },
      responseType: 'text',
    });
    logger.info('File read successfully', { hostId: hostId.toString(), path });
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError<string>(error, 'readFile');
  }
}

export async function writeFile(
  hostId: number,
  path: string,
  content: string,
): Promise<ApiResult<void>> {
  try {
    logger.info('Writing file', { hostId: hostId.toString(), path });
    const response = await api.post(API_ENDPOINTS.FILES.UPLOAD(hostId), {
      path,
      content,
    });
    logger.info('File written successfully', { hostId: hostId.toString(), path });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'writeFile');
  }
}

export async function deleteFile(hostId: number, path: string): Promise<ApiResult<void>> {
  try {
    logger.info('Deleting file', { hostId: hostId.toString(), path });
    const response = await api.delete(API_ENDPOINTS.FILES.DELETE(hostId), {
      params: { path },
    });
    logger.info('File deleted successfully', { hostId: hostId.toString(), path });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'deleteFile');
  }
}

export async function createDirectory(
  hostId: number,
  path: string,
): Promise<ApiResult<void>> {
  try {
    logger.info('Creating directory', { hostId: hostId.toString(), path });
    const response = await api.post(API_ENDPOINTS.FILES.UPLOAD(hostId), {
      path,
      isDirectory: true,
    });
    logger.info('Directory created successfully', { hostId: hostId.toString(), path });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'createDirectory');
  }
}
