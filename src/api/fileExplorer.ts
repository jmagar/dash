import axios from 'axios';

import { FileItem, ApiResult } from '../types';
import { handleApiError, API_ENDPOINTS, BASE_URL } from '../types/api';

export const listFiles = async (
  hostId: number,
  path: string,
): Promise<ApiResult<FileItem[]>> => {
  try {
    const { data } = await axios.get<FileItem[]>(
      `${BASE_URL}${API_ENDPOINTS.FILES.LIST(hostId)}`,
      { params: { path } },
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<FileItem[]>(error);
  }
};

export const deleteFile = async (
  hostId: number,
  path: string,
): Promise<ApiResult<void>> => {
  try {
    await axios.delete(`${BASE_URL}${API_ENDPOINTS.FILES.DELETE(hostId)}`, {
      params: { path },
    });
    return {
      success: true,
    };
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const createDirectory = async (
  hostId: number,
  path: string,
): Promise<ApiResult<void>> => {
  try {
    await axios.post(`${BASE_URL}${API_ENDPOINTS.FILES.LIST(hostId)}`, {
      path,
      type: 'directory',
    });
    return {
      success: true,
    };
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const readFile = async (
  hostId: number,
  path: string,
): Promise<ApiResult<string>> => {
  try {
    const { data } = await axios.get<{ content: string }>(
      `${BASE_URL}${API_ENDPOINTS.FILES.LIST(hostId)}/content`,
      { params: { path } },
    );
    return {
      success: true,
      data: data.content,
    };
  } catch (error) {
    return handleApiError<string>(error);
  }
};

export const writeFile = async (
  hostId: number,
  path: string,
  content: string,
): Promise<ApiResult<void>> => {
  try {
    await axios.put(
      `${BASE_URL}${API_ENDPOINTS.FILES.LIST(hostId)}/content`,
      { path, content },
    );
    return {
      success: true,
    };
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const uploadFile = async (
  hostId: number,
  path: string,
  file: File,
): Promise<ApiResult<void>> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);

    await axios.post(
      `${BASE_URL}${API_ENDPOINTS.FILES.UPLOAD(hostId)}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return {
      success: true,
    };
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const downloadFile = async (
  hostId: number,
  path: string,
): Promise<ApiResult<Blob>> => {
  try {
    const { data } = await axios.get(
      `${BASE_URL}${API_ENDPOINTS.FILES.DOWNLOAD(hostId)}`,
      {
        params: { path },
        responseType: 'blob',
      },
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<Blob>(error);
  }
};
