import axios from 'axios';

import type { FileItem, ApiResult } from '../../types';
import { API_ENDPOINTS } from '../../types/api-shared';
import { handleApiError } from '../../types/error';
import { BASE_URL } from '../config';

export async function listFiles(hostId: number, path?: string): Promise<ApiResult<FileItem[]>> {
  try {
    const response = await axios.get(`${BASE_URL}${API_ENDPOINTS.FILES.LIST(hostId)}`, {
      params: { path },
    });
    return response.data;
  } catch (error) {
    return handleApiError<FileItem[]>(error);
  }
}

export async function readFile(hostId: number, path: string): Promise<ApiResult<string>> {
  try {
    const response = await axios.get(`${BASE_URL}${API_ENDPOINTS.FILES.DOWNLOAD(hostId)}`, {
      params: { path },
      responseType: 'text',
    });
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError<string>(error);
  }
}

export async function writeFile(
  hostId: number,
  path: string,
  content: string,
): Promise<ApiResult<void>> {
  try {
    const response = await axios.post(`${BASE_URL}${API_ENDPOINTS.FILES.UPLOAD(hostId)}`, {
      path,
      content,
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function deleteFile(hostId: number, path: string): Promise<ApiResult<void>> {
  try {
    const response = await axios.delete(`${BASE_URL}${API_ENDPOINTS.FILES.DELETE(hostId)}`, {
      params: { path },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function createDirectory(
  hostId: number,
  path: string,
): Promise<ApiResult<void>> {
  try {
    const response = await axios.post(`${BASE_URL}${API_ENDPOINTS.FILES.UPLOAD(hostId)}`, {
      path,
      isDirectory: true,
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}
