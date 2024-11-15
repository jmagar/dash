import { api } from './api';
import { createApiError } from '../../types/error';
import type { Host, SystemStats } from '../../types/models-shared';
import { logger } from '../utils/logger';

const HOST_ENDPOINTS = {
  LIST: '/hosts',
  GET: (id: number) => `/hosts/${id}`,
  CREATE: '/hosts',
  UPDATE: (id: number) => `/hosts/${id}`,
  DELETE: (id: number) => `/hosts/${id}`,
  TEST: (id: number) => `/hosts/${id}/test`,
  TEST_CONFIG: '/hosts/test',
  STATS: (id: number) => `/hosts/${id}/stats`,
  CONNECT: (id: number) => `/hosts/${id}/connect`,
  DISCONNECT: (id: number) => `/hosts/${id}/disconnect`,
} as const;

export async function listHosts(): Promise<Host[]> {
  try {
    const response = await api.get<{ data: Host[] }>(HOST_ENDPOINTS.LIST);
    return response.data.data;
  } catch (error) {
    logger.error('Failed to list hosts:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to list hosts', error, 500);
  }
}

export async function getHost(id: number): Promise<Host> {
  try {
    const response = await api.get<{ data: Host }>(HOST_ENDPOINTS.GET(id));
    return response.data.data;
  } catch (error) {
    logger.error('Failed to get host:', {
      id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to get host', error, 404);
  }
}

export async function createHost(host: Partial<Host>): Promise<Host> {
  try {
    const response = await api.post<{ data: Host }>(HOST_ENDPOINTS.CREATE, host);
    return response.data.data;
  } catch (error) {
    logger.error('Failed to create host:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to create host', error, 400);
  }
}

export async function updateHost(id: number, host: Partial<Host>): Promise<Host> {
  try {
    const response = await api.put<{ data: Host }>(HOST_ENDPOINTS.UPDATE(id), host);
    return response.data.data;
  } catch (error) {
    logger.error('Failed to update host:', {
      id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to update host', error, 400);
  }
}

export async function deleteHost(id: number): Promise<void> {
  try {
    await api.delete(HOST_ENDPOINTS.DELETE(id));
  } catch (error) {
    logger.error('Failed to delete host:', {
      id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to delete host', error, 404);
  }
}

export async function testHost(config: Partial<Host>): Promise<boolean> {
  try {
    const response = await api.post<{ data: { success: boolean } }>(HOST_ENDPOINTS.TEST_CONFIG, config);
    return response.data.data.success;
  } catch (error) {
    logger.error('Failed to test host:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to test host', error, 400);
  }
}

export async function testExistingHost(id: number): Promise<boolean> {
  try {
    const response = await api.post<{ data: { success: boolean } }>(HOST_ENDPOINTS.TEST(id));
    return response.data.data.success;
  } catch (error) {
    logger.error('Failed to test host:', {
      id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to test host', error, 400);
  }
}

export async function getHostStats(id: number): Promise<SystemStats> {
  try {
    const response = await api.get<{ data: SystemStats }>(HOST_ENDPOINTS.STATS(id));
    return response.data.data;
  } catch (error) {
    logger.error('Failed to get host stats:', {
      id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to get host stats', error, 404);
  }
}

export async function connectHost(id: number): Promise<void> {
  try {
    await api.post(HOST_ENDPOINTS.CONNECT(id));
  } catch (error) {
    logger.error('Failed to connect host:', {
      id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to connect host', error, 400);
  }
}

export async function disconnectHost(id: number): Promise<void> {
  try {
    await api.post(HOST_ENDPOINTS.DISCONNECT(id));
  } catch (error) {
    logger.error('Failed to disconnect host:', {
      id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to disconnect host', error, 400);
  }
}
