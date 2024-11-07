import axios from 'axios';
import type { Package } from '../types/models';
import type { ApiResponse, ApiResult } from '../types/api';
import { handleApiError } from '../types/api';

const BASE_URL = process.env.REACT_APP_API_URL || '';

export const fetchPackages = async (hostId: number): ApiResult<Package[]> => {
  try {
    const { data } = await axios.get<Package[]>(`${BASE_URL}/api/packages/${hostId}/list`);
    return {
      success: true,
      data,
    } as ApiResponse<Package[]>;
  } catch (error) {
    return handleApiError<Package[]>(error);
  }
};

export const installPackage = async (hostId: number, packageName: string): ApiResult<void> => {
  try {
    await axios.post(`${BASE_URL}/api/packages/${hostId}/install`, { packageName });
    return {
      success: true,
      data: undefined,
    } as ApiResponse<void>;
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const uninstallPackage = async (hostId: number, packageName: string): ApiResult<void> => {
  try {
    await axios.post(`${BASE_URL}/api/packages/${hostId}/uninstall`, { packageName });
    return {
      success: true,
      data: undefined,
    } as ApiResponse<void>;
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const updatePackage = async (hostId: number, packageName: string): ApiResult<void> => {
  try {
    await axios.post(`${BASE_URL}/api/packages/${hostId}/update`, { packageName });
    return {
      success: true,
      data: undefined,
    } as ApiResponse<void>;
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const checkForUpdates = async (hostId: number): ApiResult<Package[]> => {
  try {
    const { data } = await axios.get<Package[]>(`${BASE_URL}/api/packages/${hostId}/updates`);
    return {
      success: true,
      data,
    } as ApiResponse<Package[]>;
  } catch (error) {
    return handleApiError<Package[]>(error);
  }
};

export const searchPackages = async (hostId: number, query: string): ApiResult<Package[]> => {
  try {
    const { data } = await axios.get<Package[]>(`${BASE_URL}/api/packages/${hostId}/search`, {
      params: { query },
    });
    return {
      success: true,
      data,
    } as ApiResponse<Package[]>;
  } catch (error) {
    return handleApiError<Package[]>(error);
  }
};
