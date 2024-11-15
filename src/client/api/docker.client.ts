import axios from 'axios';

import type { Container, ContainerStats, Stack } from '../../types/models-shared';
import { createApiError } from '../../types/error';
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

export interface DockerResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export async function listContainers(): Promise<DockerResponse<Container[]>> {
  try {
    logger.info('Listing containers');
    const response = await api.get<DockerResponse<Container[]>>(`/docker/containers`);
    logger.info('Containers listed successfully', { count: response.data?.data?.length });
    return response.data;
  } catch (error) {
    logger.error('Failed to list containers:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to list containers', error, 404);
  }
}

export async function getContainerLogs(id: string): Promise<DockerResponse<string>> {
  try {
    logger.info('Fetching container logs', { containerId: id });
    const response = await api.get<DockerResponse<string>>(`/docker/containers/${id}/logs`);
    logger.info('Container logs fetched successfully', { containerId: id });
    return response.data;
  } catch (error) {
    logger.error('Failed to get container logs:', {
      containerId: id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to get container logs', error, 404);
  }
}

export async function startContainer(id: string): Promise<DockerResponse<void>> {
  try {
    logger.info('Starting container', { containerId: id });
    const response = await api.post<DockerResponse<void>>(`/docker/containers/${id}/start`);
    logger.info('Container started successfully', { containerId: id });
    return response.data;
  } catch (error) {
    logger.error('Failed to start container:', {
      containerId: id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to start container', error, 400);
  }
}

export async function stopContainer(id: string): Promise<DockerResponse<void>> {
  try {
    logger.info('Stopping container', { containerId: id });
    const response = await api.post<DockerResponse<void>>(`/docker/containers/${id}/stop`);
    logger.info('Container stopped successfully', { containerId: id });
    return response.data;
  } catch (error) {
    logger.error('Failed to stop container:', {
      containerId: id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to stop container', error, 400);
  }
}

export async function restartContainer(id: string): Promise<DockerResponse<void>> {
  try {
    logger.info('Restarting container', { containerId: id });
    const response = await api.post<DockerResponse<void>>(`/docker/containers/${id}/restart`);
    logger.info('Container restarted successfully', { containerId: id });
    return response.data;
  } catch (error) {
    logger.error('Failed to restart container:', {
      containerId: id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to restart container', error, 400);
  }
}

export async function removeContainer(id: string): Promise<DockerResponse<void>> {
  try {
    logger.info('Removing container', { containerId: id });
    const response = await api.delete<DockerResponse<void>>(`/docker/containers/${id}`);
    logger.info('Container removed successfully', { containerId: id });
    return response.data;
  } catch (error) {
    logger.error('Failed to remove container:', {
      containerId: id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to remove container', error, 400);
  }
}

export async function getContainerStats(id: string): Promise<DockerResponse<ContainerStats>> {
  try {
    logger.info('Fetching container stats', { containerId: id });
    const response = await api.get<DockerResponse<ContainerStats>>(`/docker/containers/${id}/stats`);
    logger.info('Container stats fetched successfully', { containerId: id });
    return response.data;
  } catch (error) {
    logger.error('Failed to get container stats:', {
      containerId: id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to get container stats', error, 404);
  }
}

export async function getStacks(): Promise<DockerResponse<Stack[]>> {
  try {
    logger.info('Fetching stacks');
    const response = await api.get<DockerResponse<Stack[]>>(`/docker/stacks`);
    logger.info('Stacks fetched successfully', { count: response.data?.data?.length });
    return response.data;
  } catch (error) {
    logger.error('Failed to get stacks:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to get stacks', error, 404);
  }
}

export async function createStack(name: string, composeFile: string): Promise<DockerResponse<void>> {
  try {
    logger.info('Creating stack', { name });
    const response = await api.post<DockerResponse<void>>(`/docker/stacks/${name}`, { composeFile });
    logger.info('Stack created successfully', { name });
    return response.data;
  } catch (error) {
    logger.error('Failed to create stack:', {
      name,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to create stack', error, 400);
  }
}

export async function deleteStack(name: string): Promise<DockerResponse<void>> {
  try {
    logger.info('Deleting stack', { name });
    const response = await api.delete<DockerResponse<void>>(`/docker/stacks/${name}`);
    logger.info('Stack deleted successfully', { name });
    return response.data;
  } catch (error) {
    logger.error('Failed to delete stack:', {
      name,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to delete stack', error, 400);
  }
}

export async function startStack(name: string): Promise<DockerResponse<void>> {
  try {
    logger.info('Starting stack', { name });
    const response = await api.post<DockerResponse<void>>(`/docker/stacks/${name}/start`);
    logger.info('Stack started successfully', { name });
    return response.data;
  } catch (error) {
    logger.error('Failed to start stack:', {
      name,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to start stack', error, 400);
  }
}

export async function stopStack(name: string): Promise<DockerResponse<void>> {
  try {
    logger.info('Stopping stack', { name });
    const response = await api.post<DockerResponse<void>>(`/docker/stacks/${name}/stop`);
    logger.info('Stack stopped successfully', { name });
    return response.data;
  } catch (error) {
    logger.error('Failed to stop stack:', {
      name,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to stop stack', error, 400);
  }
}

export async function getStackComposeFile(name: string): Promise<DockerResponse<string>> {
  try {
    logger.info('Fetching stack compose file', { name });
    const response = await api.get<DockerResponse<string>>(`/docker/stacks/${name}`);
    logger.info('Stack compose file fetched successfully', { name });
    return response.data;
  } catch (error) {
    logger.error('Failed to get stack compose file:', {
      name,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to get stack compose file', error, 404);
  }
}

export async function updateStackComposeFile(name: string, composeFile: string): Promise<DockerResponse<void>> {
  try {
    logger.info('Updating stack compose file', { name });
    const response = await api.put<DockerResponse<void>>(`/docker/stacks/${name}`, { composeFile });
    logger.info('Stack compose file updated successfully', { name });
    return response.data;
  } catch (error) {
    logger.error('Failed to update stack compose file:', {
      name,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to update stack compose file', error, 400);
  }
}
