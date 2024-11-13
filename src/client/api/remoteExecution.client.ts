import axios from 'axios';

import type { ApiResult, Command, CommandResult } from '../../types';
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

export async function executeCommand(
  hostId: number,
  command: Command,
): Promise<ApiResult<CommandResult>> {
  try {
    logger.info('Executing command', { hostId: String(hostId), command: command.command });
    const response = await api.post(API_ENDPOINTS.EXECUTE.COMMAND(hostId), command);
    logger.info('Command executed successfully', { hostId: String(hostId) });
    return response.data;
  } catch (error) {
    return handleApiError<CommandResult>(error, 'executeCommand');
  }
}

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

export async function getCommandHistory(hostId: number): Promise<ApiResult<string[]>> {
  try {
    logger.info('Getting command history', { hostId: String(hostId) });
    const response = await api.get(API_ENDPOINTS.EXECUTE.HISTORY(hostId));
    logger.info('Command history retrieved successfully', { hostId: String(hostId) });
    return response.data;
  } catch (error) {
    return handleApiError<string[]>(error, 'getCommandHistory');
  }
}

export async function getSavedCommands(hostId: number): Promise<ApiResult<Command[]>> {
  try {
    logger.info('Getting saved commands', { hostId: String(hostId) });
    const response = await api.get(API_ENDPOINTS.EXECUTE.SAVED(hostId));
    logger.info('Saved commands retrieved successfully', { hostId: String(hostId) });
    return response.data;
  } catch (error) {
    return handleApiError<Command[]>(error, 'getSavedCommands');
  }
}

export async function saveCommand(
  hostId: number,
  command: Command,
): Promise<ApiResult<void>> {
  try {
    logger.info('Saving command', { hostId: String(hostId), command: command.command });
    const response = await api.post(API_ENDPOINTS.EXECUTE.SAVED(hostId), command);
    logger.info('Command saved successfully', { hostId: String(hostId) });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'saveCommand');
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
