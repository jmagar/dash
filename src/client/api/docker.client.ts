import axios from 'axios';

import type { ApiResult, Container, ContainerStats } from '../../types';
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
    logger.error('Docker API request failed:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      error: error.message,
      response: error.response?.data,
    });
    return Promise.reject(error);
  },
);

export async function listContainers(): Promise<ApiResult<Container[]>> {
  try {
    logger.info('Listing containers');
    const response = await api.get(API_ENDPOINTS.DOCKER.CONTAINERS);
    logger.info('Containers listed successfully', { count: response.data?.data?.length });
    return response.data;
  } catch (error) {
    return handleApiError<Container[]>(error, 'listContainers');
  }
}

export async function getContainerLogs(id: string): Promise<ApiResult<string>> {
  try {
    logger.info('Fetching container logs', { containerId: id });
    const response = await api.get(API_ENDPOINTS.DOCKER.CONTAINER_LOGS(id));
    logger.info('Container logs fetched successfully', { containerId: id });
    return response.data;
  } catch (error) {
    return handleApiError<string>(error, 'getContainerLogs');
  }
}

export async function startContainer(id: string): Promise<ApiResult<void>> {
  try {
    logger.info('Starting container', { containerId: id });
    const response = await api.post(`${API_ENDPOINTS.DOCKER.CONTAINER(id)}/start`);
    logger.info('Container started successfully', { containerId: id });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'startContainer');
  }
}

export async function stopContainer(id: string): Promise<ApiResult<void>> {
  try {
    logger.info('Stopping container', { containerId: id });
    const response = await api.post(`${API_ENDPOINTS.DOCKER.CONTAINER(id)}/stop`);
    logger.info('Container stopped successfully', { containerId: id });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'stopContainer');
  }
}

export async function restartContainer(id: string): Promise<ApiResult<void>> {
  try {
    logger.info('Restarting container', { containerId: id });
    const response = await api.post(`${API_ENDPOINTS.DOCKER.CONTAINER(id)}/restart`);
    logger.info('Container restarted successfully', { containerId: id });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'restartContainer');
  }
}

export async function removeContainer(id: string): Promise<ApiResult<void>> {
  try {
    logger.info('Removing container', { containerId: id });
    const response = await api.delete(API_ENDPOINTS.DOCKER.CONTAINER(id));
    logger.info('Container removed successfully', { containerId: id });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'removeContainer');
  }
}

export async function getContainerStats(id: string): Promise<ApiResult<ContainerStats>> {
  try {
    logger.info('Fetching container stats', { containerId: id });
    const response = await api.get(API_ENDPOINTS.DOCKER.CONTAINER_STATS(id));
    logger.info('Container stats fetched successfully', { containerId: id });
    return response.data;
  } catch (error) {
    return handleApiError<ContainerStats>(error, 'getContainerStats');
  }
}
