import axios from 'axios';
import type { Package } from '../types/models';
import type { ApiResult } from '../types';
import { handleApiError, API_ENDPOINTS, BASE_URL } from '../types/api';

export const fetchPackages = async (hostId: number): Promise<ApiResult<Package[]>> => {
  try {
    const { data } = await axios.get<Package[]>(
      `${BASE_URL}${API_ENDPOINTS.PACKAGES.LIST(hostId)}`
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<Package[]>(error);
  }
};

export const installPackage = async (hostId: number, packageName: string): Promise<ApiResult<void>> => {
  try {
    await axios.post(
      `${BASE_URL}${API_ENDPOINTS.PACKAGES.INSTALL(hostId)}`,
      { packageName }
    );
    return {
      success: true,
    };
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const uninstallPackage = async (hostId: number, packageName: string): Promise<ApiResult<void>> => {
  try {
    await axios.post(
      `${BASE_URL}${API_ENDPOINTS.PACKAGES.UNINSTALL(hostId)}`,
      { packageName }
    );
    return {
      success: true,
    };
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const updatePackage = async (hostId: number, packageName: string): Promise<ApiResult<void>> => {
  try {
    await axios.post(
      `${BASE_URL}${API_ENDPOINTS.PACKAGES.UPDATE(hostId)}`,
      { packageName }
    );
    return {
      success: true,
    };
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const checkForUpdates = async (hostId: number): Promise<ApiResult<Package[]>> => {
  try {
    const { data } = await axios.get<Package[]>(
      `${BASE_URL}${API_ENDPOINTS.PACKAGES.LIST(hostId)}/updates`
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<Package[]>(error);
  }
};

export const searchPackages = async (hostId: number, query: string): Promise<ApiResult<Package[]>> => {
  try {
    const { data } = await axios.get<Package[]>(
      `${BASE_URL}${API_ENDPOINTS.PACKAGES.LIST(hostId)}/search`,
      {
        params: { query },
      }
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<Package[]>(error);
  }
};
