import axios from 'axios';

import type { ApiResult, Host } from '../../types';
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
    logger.error('Host API request failed:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      error: error.message,
      response: error.response?.data,
    });
    return Promise.reject(error);
  },
);

export async function listHosts(): Promise<ApiResult<Host[]>> {
  try {
    logger.info('Listing hosts');
    const response = await api.get(API_ENDPOINTS.HOSTS.LIST);
    logger.info('Hosts listed successfully', { count: response.data?.data?.length });
    return response.data;
  } catch (error) {
    return handleApiError<Host[]>(error, 'listHosts');
  }
}

export async function addHost(host: Partial<Host>): Promise<ApiResult<Host>> {
  try {
    // Validate required fields
    const validationError = validateHost(host);
    if (validationError) {
      logger.warn('Host validation failed:', {
        host: {
          ...host,
          credentials: host.credentials ? {
            ...host.credentials,
            password: '[REDACTED]',
            privateKey: '[REDACTED]',
          } : undefined,
        },
        error: validationError,
      });
      return {
        success: false,
        error: validationError,
      };
    }

    logger.info('Adding host', {
      host: {
        ...host,
        credentials: host.credentials ? {
          ...host.credentials,
          password: '[REDACTED]',
          privateKey: '[REDACTED]',
        } : undefined,
      },
    });
    const response = await api.post<ApiResult<Host>>(API_ENDPOINTS.HOSTS.ADD, host);
    logger.info('Host added successfully', { hostId: String(response.data?.data?.id) });
    return response.data;
  } catch (error) {
    return handleApiError<Host>(error, 'addHost');
  }
}

export async function updateHost(host: Partial<Host>): Promise<ApiResult<Host>> {
  try {
    // Validate required fields
    const validationError = validateHost(host);
    if (validationError) {
      logger.warn('Host validation failed:', {
        host: {
          ...host,
          credentials: host.credentials ? {
            ...host.credentials,
            password: '[REDACTED]',
            privateKey: '[REDACTED]',
          } : undefined,
        },
        error: validationError,
      });
      return {
        success: false,
        error: validationError,
      };
    }

    logger.info('Updating host', { hostId: String(host.id) });
    const response = await api.put<ApiResult<Host>>(
      API_ENDPOINTS.HOSTS.REMOVE(host.id as number),
      host,
    );
    logger.info('Host updated successfully', { hostId: String(host.id) });
    return response.data;
  } catch (error) {
    return handleApiError<Host>(error, 'updateHost');
  }
}

export async function deleteHost(id: number): Promise<ApiResult<void>> {
  try {
    logger.info('Deleting host', { hostId: String(id) });
    const response = await api.delete(API_ENDPOINTS.HOSTS.REMOVE(id));
    logger.info('Host deleted successfully', { hostId: String(id) });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'deleteHost');
  }
}

export async function testConnection(id: number): Promise<ApiResult<void>> {
  try {
    logger.info('Testing host connection', { hostId: String(id) });
    const response = await api.post(API_ENDPOINTS.HOSTS.TEST_CONNECTION);
    logger.info('Host connection test successful', { hostId: String(id) });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'testConnection');
  }
}

function validateHost(host: Partial<Host>): string | null {
  if (!host.name) {
    return 'Host name is required';
  }
  if (!host.hostname) {
    return 'Hostname is required';
  }
  if (!host.username) {
    return 'Username is required';
  }
  if (!host.id && !host.credentials?.password && !host.credentials?.privateKey) {
    return 'Either password or SSH key is required';
  }
  return null;
}
