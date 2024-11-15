import { api } from './api';
import { createApiError } from '../../types/error';
import type { Package } from '../../types/models-shared';
import type { ApiResponse } from '../../types/models-shared';
import { logger } from '../utils/frontendLogger';

const PKG_ENDPOINTS = {
  LIST: (hostId: number) => `/packages/${hostId}/list`,
  SEARCH: (hostId: number) => `/packages/${hostId}/search`,
  INSTALL: (hostId: number) => `/packages/${hostId}/install`,
  UNINSTALL: (hostId: number) => `/packages/${hostId}/uninstall`,
  UPDATE: (hostId: number) => `/packages/${hostId}/update`,
  INFO: (hostId: number, packageName: string) => `/packages/${hostId}/${packageName}`,
} as const;

export async function listPackages(hostId: number): Promise<ApiResponse<Package[]>> {
  try {
    const response = await api.get<ApiResponse<Package[]>>(PKG_ENDPOINTS.LIST(hostId));
    return response.data;
  } catch (error) {
    logger.error('Failed to list packages:', {
      hostId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to list packages', error);
  }
}

export async function searchPackages(hostId: number, query: string): Promise<ApiResponse<Package[]>> {
  try {
    const response = await api.get<ApiResponse<Package[]>>(PKG_ENDPOINTS.SEARCH(hostId), {
      params: { query },
    });
    return response.data;
  } catch (error) {
    logger.error('Failed to search packages:', {
      hostId,
      query,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to search packages', error);
  }
}

export async function installPackage(hostId: number, pkg: string, version?: string): Promise<ApiResponse<void>> {
  try {
    const response = await api.post<ApiResponse<void>>(PKG_ENDPOINTS.INSTALL(hostId), { package: pkg, version });
    return response.data;
  } catch (error) {
    logger.error('Failed to install package:', {
      hostId,
      package: pkg,
      version,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to install package', error);
  }
}

export async function uninstallPackage(hostId: number, pkg: string): Promise<ApiResponse<void>> {
  try {
    const response = await api.post<ApiResponse<void>>(PKG_ENDPOINTS.UNINSTALL(hostId), { package: pkg });
    return response.data;
  } catch (error) {
    logger.error('Failed to uninstall package:', {
      hostId,
      package: pkg,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to uninstall package', error);
  }
}

export async function updatePackage(hostId: number, pkg: string): Promise<ApiResponse<void>> {
  try {
    const response = await api.post<ApiResponse<void>>(PKG_ENDPOINTS.UPDATE(hostId), { package: pkg });
    return response.data;
  } catch (error) {
    logger.error('Failed to update package:', {
      hostId,
      package: pkg,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to update package', error);
  }
}

export async function listInstalledPackages(hostId: number): Promise<ApiResponse<Package[]>> {
  try {
    logger.info('Listing installed packages', { hostId: String(hostId) });
    const response = await api.get<ApiResponse<Package[]>>(PKG_ENDPOINTS.LIST(hostId));
    logger.info('Installed packages listed successfully', {
      hostId: String(hostId),
      count: response.data.data?.length ?? 0
    });
    return response.data;
  } catch (error) {
    logger.error('Failed to list installed packages:', {
      hostId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to list installed packages', error);
  }
}

export async function getPackageInfo(hostId: number, packageName: string): Promise<ApiResponse<Package>> {
  try {
    logger.info('Getting package info', { hostId: String(hostId), packageName });
    const response = await api.get<ApiResponse<Package>>(PKG_ENDPOINTS.INFO(hostId, packageName));
    logger.info('Package info retrieved successfully', {
      hostId: String(hostId),
      packageName
    });
    return response.data;
  } catch (error) {
    logger.error('Failed to get package info:', {
      hostId,
      packageName,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to get package info', error);
  }
}
