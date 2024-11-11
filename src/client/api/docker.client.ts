import axios from 'axios';

import type { Container, Stack, ApiResult } from '../../types';
import { API_ENDPOINTS } from '../../types/api-shared';
import { handleApiError } from '../../types/error';
import { BASE_URL } from '../config';

export async function getContainers(): Promise<ApiResult<Container[]>> {
  try {
    const response = await axios.get(`${BASE_URL}${API_ENDPOINTS.DOCKER.CONTAINERS}`);
    return response.data;
  } catch (error) {
    return handleApiError<Container[]>(error);
  }
}

export async function getContainerLogs(id: string): Promise<ApiResult<string>> {
  try {
    const response = await axios.get(`${BASE_URL}${API_ENDPOINTS.DOCKER.CONTAINER_LOGS(id)}`);
    return response.data;
  } catch (error) {
    return handleApiError<string>(error);
  }
}

export async function startContainer(id: string): Promise<ApiResult<void>> {
  try {
    const response = await axios.post(`${BASE_URL}${API_ENDPOINTS.DOCKER.CONTAINER(id)}/start`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function stopContainer(id: string): Promise<ApiResult<void>> {
  try {
    const response = await axios.post(`${BASE_URL}${API_ENDPOINTS.DOCKER.CONTAINER(id)}/stop`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function restartContainer(id: string): Promise<ApiResult<void>> {
  try {
    const response = await axios.post(`${BASE_URL}${API_ENDPOINTS.DOCKER.CONTAINER(id)}/restart`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function removeContainer(id: string): Promise<ApiResult<void>> {
  try {
    const response = await axios.delete(`${BASE_URL}${API_ENDPOINTS.DOCKER.CONTAINER(id)}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function getStacks(): Promise<ApiResult<Stack[]>> {
  try {
    const response = await axios.get(`${BASE_URL}${API_ENDPOINTS.DOCKER.STACKS}`);
    return response.data;
  } catch (error) {
    return handleApiError<Stack[]>(error);
  }
}

export async function createStack(name: string, composeFile: string): Promise<ApiResult<void>> {
  try {
    const response = await axios.post(`${BASE_URL}${API_ENDPOINTS.DOCKER.STACKS}`, {
      name,
      composeFile,
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function deleteStack(name: string): Promise<ApiResult<void>> {
  try {
    const response = await axios.delete(`${BASE_URL}${API_ENDPOINTS.DOCKER.STACK(name)}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function startStack(name: string): Promise<ApiResult<void>> {
  try {
    const response = await axios.post(`${BASE_URL}${API_ENDPOINTS.DOCKER.STACK_START(name)}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function stopStack(name: string): Promise<ApiResult<void>> {
  try {
    const response = await axios.post(`${BASE_URL}${API_ENDPOINTS.DOCKER.STACK_STOP(name)}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function getStackComposeFile(name: string): Promise<ApiResult<string>> {
  try {
    const response = await axios.get(`${BASE_URL}${API_ENDPOINTS.DOCKER.STACK(name)}/compose`);
    return response.data;
  } catch (error) {
    return handleApiError<string>(error);
  }
}

export async function updateStackComposeFile(name: string, composeFile: string): Promise<ApiResult<void>> {
  try {
    const response = await axios.put(`${BASE_URL}${API_ENDPOINTS.DOCKER.STACK(name)}/compose`, {
      composeFile,
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}
