import axios from 'axios';

import type { Host, SystemStats, ApiResult } from '../../types';
import { API_ENDPOINTS } from '../../types/api-shared';
import { handleApiError } from '../../types/error';
import { APP_CONFIG } from '../config';
import { logger } from '../utils/frontendLogger';

interface HostsResponse {
  success: boolean;
  data: Host[];
  error?: string;
}

// Configure axios
const api = axios.create({
  baseURL: APP_CONFIG.api.baseUrl,
  timeout: APP_CONFIG.api.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    logger.error('API request failed:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      error: error.message,
      response: error.response?.data,
    });
    return Promise.reject(error);
  },
);

// Validation functions
const validateHost = (host: Partial<Host>): string | null => {
  if (!host.name?.trim()) return 'Display name is required';
  if (!host.hostname?.trim()) return 'Hostname is required';
  if (!host.username?.trim()) return 'Username is required';
  if (typeof host.port !== 'number' || host.port < 1 || host.port > 65535) {
    return 'Port must be a number between 1 and 65535';
  }
  return null;
};

// Connection test configuration
const CONNECTION_TEST_RETRIES = 2;
const CONNECTION_TEST_TIMEOUT = 10000;
const RETRY_DELAY = 2000;

// Retry utility
async function retryOperation<T>(
  operation: () => Promise<T>,
  retries: number,
  delay: number,
  timeout: number,
  context: string,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      logger.debug(`${context}: Attempt ${attempt + 1}/${retries + 1}`);
      const response = await Promise.race([
        operation(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Operation timed out')), timeout),
        ),
      ]);
      return response;
    } catch (error) {
      lastError = error as Error;
      logger.warn(`${context}: Attempt ${attempt + 1} failed`, { error: lastError });

      if (attempt < retries) {
        const backoffDelay = delay * Math.pow(2, attempt);
        logger.debug(`${context}: Retrying in ${backoffDelay}ms`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
  }

  throw lastError || new Error('Operation failed after retries');
}

export async function listHosts(): Promise<ApiResult<Host[]>> {
  try {
    logger.info('Fetching hosts list');
    const response = await api.get<HostsResponse>(API_ENDPOINTS.HOSTS.LIST);
    logger.info('Hosts list fetched successfully', { count: response.data?.data?.length });
    return {
      success: response.data.success,
      data: response.data.data,
      error: response.data.error,
    };
  } catch (error) {
    return handleApiError<Host[]>(error, 'listHosts');
  }
}

export async function addHost(host: Omit<Host, 'id'>): Promise<ApiResult<Host>> {
  try {
    // Validate host data before making request
    const validationError = validateHost(host);
    if (validationError) {
      logger.warn('Host validation failed:', { host: { ...host, password: '[REDACTED]' }, error: validationError });
      return {
        success: false,
        error: validationError,
      };
    }

    // First test the connection
    logger.info('Testing connection before adding host:', { hostname: host.hostname });
    const testResult = await testConnection(host);
    if (!testResult.success) {
      return {
        success: false,
        error: testResult.error,
      };
    }

    // If connection test succeeds, add the host
    logger.info('Connection test successful, adding host:', { hostname: host.hostname });
    const response = await api.post<ApiResult<Host>>(API_ENDPOINTS.HOSTS.ADD, host);
    logger.info('Host added successfully', { hostId: response.data?.data?.id });
    return response.data;
  } catch (error) {
    return handleApiError<Host>(error, 'addHost');
  }
}

export async function removeHost(id: number): Promise<ApiResult<void>> {
  try {
    logger.info('Removing host:', { id });
    const response = await api.delete<ApiResult<void>>(API_ENDPOINTS.HOSTS.REMOVE(id));
    logger.info('Host removed successfully', { id });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'removeHost');
  }
}

export async function getHostStatus(id: number): Promise<ApiResult<boolean>> {
  try {
    const response = await api.get<ApiResult<boolean>>(API_ENDPOINTS.HOSTS.STATUS);
    return response.data;
  } catch (error) {
    return handleApiError<boolean>(error, 'getHostStatus');
  }
}

export async function testConnection(host: Omit<Host, 'id'>): Promise<ApiResult<void>> {
  try {
    // Validate host data before testing
    const validationError = validateHost(host);
    if (validationError) {
      logger.warn('Host validation failed:', { host: { ...host, password: '[REDACTED]' }, error: validationError });
      return {
        success: false,
        error: validationError,
      };
    }

    logger.info('Testing connection with retries:', { hostname: host.hostname });

    const response = await retryOperation(
      () => api.post<ApiResult<void>>(
        API_ENDPOINTS.HOSTS.TEST_CONNECTION,
        host,
        { timeout: CONNECTION_TEST_TIMEOUT },
      ),
      CONNECTION_TEST_RETRIES,
      RETRY_DELAY,
      CONNECTION_TEST_TIMEOUT,
      'Connection test',
    );

    logger.info('Connection test completed', {
      hostname: host.hostname,
      success: response.data.success,
    });

    return response.data;
  } catch (error) {
    return handleApiError(error, 'testConnection');
  }
}

export async function testExistingHost(id: number): Promise<ApiResult<void>> {
  try {
    logger.info('Testing existing host connection:', { id });

    const response = await retryOperation(
      () => api.post<ApiResult<void>>(
        API_ENDPOINTS.HOSTS.TEST_CONNECTION,
        { id },
        { timeout: CONNECTION_TEST_TIMEOUT },
      ),
      CONNECTION_TEST_RETRIES,
      RETRY_DELAY,
      CONNECTION_TEST_TIMEOUT,
      'Existing host test',
    );

    logger.info('Existing host test completed', {
      id,
      success: response.data.success,
    });

    return response.data;
  } catch (error) {
    return handleApiError(error, 'testExistingHost');
  }
}

export async function getSystemStats(id: number): Promise<ApiResult<SystemStats>> {
  try {
    const response = await api.get<ApiResult<SystemStats>>(API_ENDPOINTS.HOSTS.STATS(id));
    return response.data;
  } catch (error) {
    return handleApiError<SystemStats>(error, 'getSystemStats');
  }
}

export async function connectHost(id: number): Promise<ApiResult<void>> {
  try {
    logger.info('Connecting to host:', { id });
    const response = await api.post<ApiResult<void>>(API_ENDPOINTS.HOSTS.CONNECT(id));
    logger.info('Host connected successfully', { id });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'connectHost');
  }
}

export async function disconnectHost(id: number): Promise<ApiResult<void>> {
  try {
    logger.info('Disconnecting from host:', { id });
    const response = await api.post<ApiResult<void>>(API_ENDPOINTS.HOSTS.DISCONNECT(id));
    logger.info('Host disconnected successfully', { id });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'disconnectHost');
  }
}
