import axios from 'axios';

import { handleApiError, API_ENDPOINTS, BASE_URL } from '../types/api';
import type { ApiResult, Package } from '../types/models';

export const searchPackages = async (
  hostId: number,
  query: string,
): Promise<ApiResult<Package[]>> => {
  try {
    const { data } = await axios.get<Package[]>(
      `${BASE_URL}${API_ENDPOINTS.PACKAGES.SEARCH(hostId)}`,
      { params: { query } },
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<Package[]>(error);
  }
};

export const installPackage = async (
  hostId: number,
  name: string,
): Promise<ApiResult<void>> => {
  try {
    await axios.post(
      `${BASE_URL}${API_ENDPOINTS.PACKAGES.INSTALL(hostId)}`,
      { name },
    );
    return {
      success: true,
    };
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const uninstallPackage = async (
  hostId: number,
  name: string,
): Promise<ApiResult<void>> => {
  try {
    await axios.post(
      `${BASE_URL}${API_ENDPOINTS.PACKAGES.UNINSTALL(hostId)}`,
      { name },
    );
    return {
      success: true,
    };
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const updatePackage = async (
  hostId: number,
  name: string,
): Promise<ApiResult<void>> => {
  try {
    await axios.post(
      `${BASE_URL}${API_ENDPOINTS.PACKAGES.UPDATE(hostId)}`,
      { name },
    );
    return {
      success: true,
    };
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const getPackageInfo = async (
  hostId: number,
  name: string,
): Promise<ApiResult<Package>> => {
  try {
    const { data } = await axios.get<Package>(
      `${BASE_URL}${API_ENDPOINTS.PACKAGES.INFO(hostId, name)}`,
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<Package>(error);
  }
};

export const listInstalledPackages = async (
  hostId: number,
): Promise<ApiResult<Package[]>> => {
  try {
    const { data } = await axios.get<Package[]>(
      `${BASE_URL}${API_ENDPOINTS.PACKAGES.LIST(hostId)}`,
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<Package[]>(error);
  }
};
