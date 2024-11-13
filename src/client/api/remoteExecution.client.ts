import axios from 'axios';

import type { ApiResult } from '../../types';
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
    logger.error('Remote Execution API request failed:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      error: error.message,
      response: error.response?.data,
    });
    return Promise.reject(error);
  },
);

export async function executeScript(
  hostId: number,
  script: string,
  args?: string[],
): Promise<ApiResult<string>> {
  try {
    logger.info('Executing script', { hostId: String(hostId), args });
    const response = await api.post(API_ENDPOINTS.EXECUTE.SCRIPT(hostId), {
      script,
      args,
    });
    logger.info('Script executed successfully', { hostId: String(hostId) });
    return response.data;
  } catch (error) {
    return handleApiError<string>(error, 'executeScript');
  }
}

export async function deleteSavedCommand(
  hostId: number,
  commandId: string,
): Promise<ApiResult<void>> {
  try {
    logger.info('Deleting saved command', { hostId: String(hostId), commandId });
    const response = await api.delete(
      API_ENDPOINTS.EXECUTE.DELETE_SAVED_COMMAND(hostId, commandId),
    );
    logger.info('Saved command deleted successfully', { hostId: String(hostId), commandId });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'deleteSavedCommand');
  }
}
