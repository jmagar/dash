import axios from 'axios';

import type { ApiResult, Package } from '../../types';
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
    logger.error('Package Manager API request failed:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      error: error.message,
      response: error.response?.data,
    });
    return Promise.reject(error);
  },
);

export async function listInstalledPackages(hostId: number): Promise<ApiResult<Package[]>> {
  try {
    logger.info('Listing installed packages', { hostId: String(hostId) });
    const response = await api.get(API_ENDPOINTS.PACKAGES.LIST(hostId));
    logger.info('Installed packages listed successfully', { hostId: String(hostId), count: response.data?.data?.length });
    return response.data;
  } catch (error) {
    return handleApiError<Package[]>(error, 'listInstalledPackages');
  }
}

export async function searchPackages(
  hostId: number,
  query: string,
): Promise<ApiResult<Package[]>> {
  try {
    logger.info('Searching packages', { hostId: String(hostId), query });
    const response = await api.get(API_ENDPOINTS.PACKAGES.SEARCH(hostId), {
      params: { query },
    });
    logger.info('Package search completed', { hostId: String(hostId), count: response.data?.data?.length });
    return response.data;
  } catch (error) {
    return handleApiError<Package[]>(error, 'searchPackages');
  }
}

export async function installPackage(
  hostId: number,
  packageName: string,
): Promise<ApiResult<void>> {
  try {
    logger.info('Installing package', { hostId: String(hostId), packageName });
    const response = await api.post(API_ENDPOINTS.PACKAGES.INSTALL(hostId), {
      package: packageName,
    });
    logger.info('Package installed successfully', { hostId: String(hostId), packageName });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'installPackage');
  }
}

export async function uninstallPackage(
  hostId: number,
  packageName: string,
): Promise<ApiResult<void>> {
  try {
    logger.info('Uninstalling package', { hostId: String(hostId), packageName });
    const response = await api.post(API_ENDPOINTS.PACKAGES.UNINSTALL(hostId), {
      package: packageName,
    });
    logger.info('Package uninstalled successfully', { hostId: String(hostId), packageName });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'uninstallPackage');
  }
}

export async function updatePackage(
  hostId: number,
  packageName: string,
): Promise<ApiResult<void>> {
  try {
    logger.info('Updating package', { hostId: String(hostId), packageName });
    const response = await api.post(API_ENDPOINTS.PACKAGES.UPDATE(hostId), {
      package: packageName,
    });
    logger.info('Package updated successfully', { hostId: String(hostId), packageName });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'updatePackage');
  }
}

export async function getPackageInfo(
  hostId: number,
  packageName: string,
): Promise<ApiResult<Package>> {
  try {
    logger.info('Getting package info', { hostId: String(hostId), packageName });
    const response = await api.get(
      API_ENDPOINTS.PACKAGES.INFO(hostId, packageName),
    );
    logger.info('Package info retrieved successfully', { hostId: String(hostId), packageName });
    return response.data;
  } catch (error) {
    return handleApiError<Package>(error, 'getPackageInfo');
  }
}
