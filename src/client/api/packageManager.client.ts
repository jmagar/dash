import type { ApiResponse } from '../../types/express';
import type { Package } from '../../types/models-shared';
import { api } from './api';
import { createApiError } from '../../types/error';
import { logger } from '../utils/frontendLogger';

const PACKAGE_ENDPOINTS = {
  LIST: (hostId: string) => `/packages/${hostId}/list`,
  INSTALL: (hostId: string) => `/packages/${hostId}/install`,
  UNINSTALL: (hostId: string) => `/packages/${hostId}/uninstall`,
  UPDATE: (hostId: string) => `/packages/${hostId}/update`,
  SEARCH: (hostId: string) => `/packages/${hostId}/search`,
} as const;

export async function listPackages(hostId: string): Promise<Package[]> {
  try {
    const response = await api.get<{ data: Package[] }>(PACKAGE_ENDPOINTS.LIST(hostId));

    return response.data.data;
  } catch (error) {
    logger.error('Failed to list packages:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      hostId,
    });
    throw createApiError('Failed to list packages', error);
  }
}

export async function installPackage(hostId: string, name: string): Promise<void> {
  try {
    await api.post(PACKAGE_ENDPOINTS.INSTALL(hostId), { name });
  } catch (error) {
    logger.error('Failed to install package:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      hostId,
      name,
    });
    throw createApiError('Failed to install package', error);
  }
}

export async function uninstallPackage(hostId: string, name: string): Promise<void> {
  try {
    await api.post(PACKAGE_ENDPOINTS.UNINSTALL(hostId), { name });
  } catch (error) {
    logger.error('Failed to uninstall package:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      hostId,
      name,
    });
    throw createApiError('Failed to uninstall package', error);
  }
}

export async function updatePackage(hostId: string, name: string): Promise<void> {
  try {
    await api.post(PACKAGE_ENDPOINTS.UPDATE(hostId), { name });
  } catch (error) {
    logger.error('Failed to update package:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      hostId,
      name,
    });
    throw createApiError('Failed to update package', error);
  }
}

export async function searchPackages(hostId: string, query: string): Promise<Package[]> {
  try {
    const response = await api.get<{ data: Package[] }>(PACKAGE_ENDPOINTS.SEARCH(hostId), {
      params: { query },
    });

    return response.data.data;
  } catch (error) {
    logger.error('Failed to search packages:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      hostId,
      query,
    });
    throw createApiError('Failed to search packages', error);
  }
}
