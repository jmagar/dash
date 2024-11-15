import { api } from './api';
import { createApiError } from '../../types/error';
import type { Host, SystemStats, CreateHostRequest } from '../../types/models-shared';
import { logger } from '../utils/frontendLogger';

const HOST_ENDPOINTS = {
  LIST: '/hosts',
  GET: (id: number) => `/hosts/${id}`,
  CREATE: '/hosts',
  UPDATE: (id: number) => `/hosts/${id}`,
  DELETE: (id: number) => `/hosts/${id}`,
  TEST: '/hosts/test',
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
    throw createApiError('Failed to list hosts', error);
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
    throw createApiError('Failed to get host', error);
  }
}

export async function createHost(host: CreateHostRequest): Promise<Host> {
  try {
    const response = await api.post<{ data: Host }>(HOST_ENDPOINTS.CREATE, host);
    return response.data.data;
  } catch (error) {
    logger.error('Failed to create host:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to create host', error);
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
    throw createApiError('Failed to update host', error);
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
    throw createApiError('Failed to delete host', error);
  }
}

export async function testHost(host: CreateHostRequest): Promise<boolean> {
  try {
    const response = await api.post<{ data: { success: boolean } }>(HOST_ENDPOINTS.TEST, host);
    return response.data.data.success;
  } catch (error) {
    logger.error('Failed to test host:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to test host', error);
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
    throw createApiError('Failed to get host stats', error);
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
    throw createApiError('Failed to connect host', error);
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
    throw createApiError('Failed to disconnect host', error);
  }
}
