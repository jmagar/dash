import axios from 'axios';
import type { FileItem, FileOperationResult } from '../types';
import type { ApiResponse, ApiResult } from '../types';
import { handleApiError } from '../types';

const BASE_URL = process.env.REACT_APP_API_URL || '';

export const listFiles = async (hostId: number, path: string): ApiResult<FileItem[]> => {
  try {
    const { data } = await axios.get<FileItem[]>(`${BASE_URL}/api/files/${hostId}/list`, {
      params: { path },
    });
    return {
      success: true,
      data,
    } as ApiResponse<FileItem[]>;
  } catch (error) {
    return handleApiError<FileItem[]>(error);
  }
};

export const readFile = async (hostId: number, path: string): ApiResult<string> => {
  try {
    const { data } = await axios.get<{ content: string }>(`${BASE_URL}/api/files/${hostId}/read`, {
      params: { path },
    });
    return {
      success: true,
      data: data.content,
    } as ApiResponse<string>;
  } catch (error) {
    return handleApiError<string>(error);
  }
};

export const writeFile = async (hostId: number, path: string, content: string): ApiResult<void> => {
  try {
    await axios.post(`${BASE_URL}/api/files/${hostId}/write`, {
      path,
      content,
    });
    return {
      success: true,
      data: undefined,
    } as ApiResponse<void>;
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const deleteFile = async (hostId: number, path: string): ApiResult<void> => {
  try {
    await axios.delete(`${BASE_URL}/api/files/${hostId}/delete`, {
      params: { path },
    });
    return {
      success: true,
      data: undefined,
    } as ApiResponse<void>;
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const createDirectory = async (hostId: number, path: string): ApiResult<void> => {
  try {
    await axios.post(`${BASE_URL}/api/files/${hostId}/mkdir`, {
      path,
    });
    return {
      success: true,
      data: undefined,
    } as ApiResponse<void>;
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const deleteDirectory = async (hostId: number, path: string): ApiResult<void> => {
  try {
    await axios.delete(`${BASE_URL}/api/files/${hostId}/rmdir`, {
      params: { path },
    });
    return {
      success: true,
      data: undefined,
    } as ApiResponse<void>;
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const moveFile = async (hostId: number, sourcePath: string, targetPath: string): ApiResult<void> => {
  try {
    await axios.post(`${BASE_URL}/api/files/${hostId}/move`, {
      sourcePath,
      targetPath,
    });
    return {
      success: true,
      data: undefined,
    } as ApiResponse<void>;
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const copyFile = async (hostId: number, sourcePath: string, targetPath: string): ApiResult<void> => {
  try {
    await axios.post(`${BASE_URL}/api/files/${hostId}/copy`, {
      sourcePath,
      targetPath,
    });
    return {
      success: true,
      data: undefined,
    } as ApiResponse<void>;
  } catch (error) {
    return handleApiError<void>(error);
  }
};
