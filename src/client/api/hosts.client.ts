
import { createApiError } from '../../types/error';
import { logger } from '../utils/frontendLogger';

import { api } from './api';

import type { Host, SystemStats, CreateHostRequest } from '../../types/models-shared';

const HOST_ENDPOINTS = {
  LIST: '/hosts',
  GET: (id: string) => `/hosts/${id}`,
  CREATE: '/hosts',
  UPDATE: (id: string) => `/hosts/${id}`,
  DELETE: (id: string) => `/hosts/${id}`,
  TEST: '/hosts/test',
  STATS: (id: string) => `/hosts/${id}/stats`,
  CONNECT: (id: string) => `/hosts/${id}/connect`,
  DISCONNECT: (id: string) => `/hosts/${id}/disconnect`,
  STATUS: (id: string) => `/hosts/${id}/status`,
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

export async function getHost(hostId: string): Promise<Host> {
  try {
    const response = await api.get<{ data: Host }>(HOST_ENDPOINTS.GET(hostId));
    return response.data.data;
  } catch (error) {
    logger.error('Failed to get host:', {
      hostId,
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

export async function updateHost(hostId: string, host: Partial<Host>): Promise<Host> {
  try {
    const response = await api.put<{ data: Host }>(HOST_ENDPOINTS.UPDATE(hostId), host);
    return response.data.data;
  } catch (error) {
    logger.error('Failed to update host:', {
      hostId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to update host', error);
  }
}

export async function deleteHost(hostId: string): Promise<void> {
  try {
    await api.delete(HOST_ENDPOINTS.DELETE(hostId));
  } catch (error) {
    logger.error('Failed to delete host:', {
      hostId,
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

export async function getHostStats(hostId: string): Promise<SystemStats> {
  try {
    const response = await api.get<{ data: SystemStats }>(HOST_ENDPOINTS.STATS(hostId));
    return response.data.data;
  } catch (error) {
    logger.error('Failed to get host stats:', {
      hostId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to get host stats', error);
  }
}

export async function connectHost(hostId: string): Promise<void> {
  try {
    await api.post(HOST_ENDPOINTS.CONNECT(hostId));
  } catch (error) {
    logger.error('Failed to connect host:', {
      hostId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to connect host', error);
  }
}

export async function disconnectHost(hostId: string): Promise<void> {
  try {
    await api.post(HOST_ENDPOINTS.DISCONNECT(hostId));
  } catch (error) {
    logger.error('Failed to disconnect host:', {
      hostId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to disconnect host', error);
  }
}

export async function getHostStatus(hostId: string): Promise<Host> {
  try {
    const response = await api.get<{ data: Host }>(HOST_ENDPOINTS.STATUS(hostId));
    return response.data.data;
  } catch (error) {
    logger.error('Failed to get host status:', {
      hostId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to get host status', error);
  }
}
