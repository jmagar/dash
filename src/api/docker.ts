import axios from 'axios';

import { Stack, Container, ApiResult } from '../types';
import { handleApiError, API_ENDPOINTS, BASE_URL } from '../types/api';

// Stack Management
export const createStack = async (
  name: string,
  composeFile: string,
): Promise<ApiResult<Stack>> => {
  try {
    const { data } = await axios.post<Stack>(
      `${BASE_URL}${API_ENDPOINTS.DOCKER.STACKS}`,
      {
        name,
        composeFile,
      },
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<Stack>(error);
  }
};

export const deleteStack = async (name: string): Promise<ApiResult<void>> => {
  try {
    await axios.delete(`${BASE_URL}${API_ENDPOINTS.DOCKER.STACK(name)}`);
    return {
      success: true,
    };
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const startStack = async (name: string): Promise<ApiResult<void>> => {
  try {
    await axios.post(`${BASE_URL}${API_ENDPOINTS.DOCKER.STACK_START(name)}`);
    return {
      success: true,
    };
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const stopStack = async (name: string): Promise<ApiResult<void>> => {
  try {
    await axios.post(`${BASE_URL}${API_ENDPOINTS.DOCKER.STACK_STOP(name)}`);
    return {
      success: true,
    };
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const getStacks = async (): Promise<ApiResult<Stack[]>> => {
  try {
    const { data } = await axios.get<Stack[]>(
      `${BASE_URL}${API_ENDPOINTS.DOCKER.STACKS}`,
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<Stack[]>(error);
  }
};

export const getStackLogs = async (name: string): Promise<ApiResult<string[]>> => {
  try {
    const { data } = await axios.get<string[]>(
      `${BASE_URL}${API_ENDPOINTS.DOCKER.STACK_LOGS(name)}`,
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<string[]>(error);
  }
};

export const getStackComposeFile = async (name: string): Promise<ApiResult<string>> => {
  try {
    const { data } = await axios.get<{ content: string }>(
      `${BASE_URL}${API_ENDPOINTS.DOCKER.STACK(name)}/compose`,
    );
    return {
      success: true,
      data: data.content,
    };
  } catch (error) {
    return handleApiError<string>(error);
  }
};

export const updateStackComposeFile = async (
  name: string,
  content: string,
): Promise<ApiResult<void>> => {
  try {
    await axios.put(
      `${BASE_URL}${API_ENDPOINTS.DOCKER.STACK(name)}/compose`,
      { content },
    );
    return {
      success: true,
    };
  } catch (error) {
    return handleApiError<void>(error);
  }
};

// Container Management
export const getContainers = async (): Promise<ApiResult<Container[]>> => {
  try {
    const { data } = await axios.get<Container[]>(
      `${BASE_URL}${API_ENDPOINTS.DOCKER.CONTAINERS}`,
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<Container[]>(error);
  }
};

export const startContainer = async (id: string): Promise<ApiResult<void>> => {
  try {
    await axios.post(`${BASE_URL}${API_ENDPOINTS.DOCKER.CONTAINER(id)}/start`);
    return {
      success: true,
    };
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const stopContainer = async (id: string): Promise<ApiResult<void>> => {
  try {
    await axios.post(`${BASE_URL}${API_ENDPOINTS.DOCKER.CONTAINER(id)}/stop`);
    return {
      success: true,
    };
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const deleteContainer = async (id: string): Promise<ApiResult<void>> => {
  try {
    await axios.delete(`${BASE_URL}${API_ENDPOINTS.DOCKER.CONTAINER(id)}`);
    return {
      success: true,
    };
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const getContainerLogs = async (id: string): Promise<ApiResult<string[]>> => {
  try {
    const { data } = await axios.get<string[]>(
      `${BASE_URL}${API_ENDPOINTS.DOCKER.CONTAINER_LOGS(id)}`,
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<string[]>(error);
  }
};

export const getContainerStats = async (id: string): Promise<ApiResult<{
  cpu: number;
  memory: {
    used: number;
    limit: number;
  };
  network: {
    rx: number;
    tx: number;
  };
}>> => {
  try {
    const { data } = await axios.get(
      `${BASE_URL}${API_ENDPOINTS.DOCKER.CONTAINER_STATS(id)}`,
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError(error);
  }
};

export const executeInContainer = async (
  id: string,
  command: string,
): Promise<ApiResult<{ output: string }>> => {
  try {
    const { data } = await axios.post<{ output: string }>(
      `${BASE_URL}${API_ENDPOINTS.DOCKER.CONTAINER_EXEC(id)}`,
      { command },
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<{ output: string }>(error);
  }
};
