import axios from 'axios';

import type { Command, CommandResult, ApiResult } from '../../types';
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
    logger.info('Executing command', {
      hostId,
      command: command.command,
      workingDirectory: command.workingDirectory,
    });
    const response = await api.post(
      API_ENDPOINTS.EXECUTE.COMMAND(hostId),
      command,
    );
    logger.info('Command executed successfully', {
      hostId,
      command: command.command,
      exitCode: response.data?.data?.exitCode,
    });
    return response.data;
  } catch (error) {
    return handleApiError<CommandResult>(error, 'executeCommand');
  }
}

export async function executeScript(
  hostId: number,
  script: string,
  args?: string[],
): Promise<ApiResult<CommandResult>> {
  try {
    logger.info('Executing script', { hostId, args });
    const response = await api.post(API_ENDPOINTS.EXECUTE.SCRIPT(hostId), {
      script,
      args,
    });
    logger.info('Script executed successfully', {
      hostId,
      exitCode: response.data?.data?.exitCode,
    });
    return response.data;
  } catch (error) {
    return handleApiError<CommandResult>(error, 'executeScript');
  }
}

export async function getCommandHistory(hostId: number): Promise<ApiResult<Command[]>> {
  try {
    logger.info('Fetching command history', { hostId });
    const response = await api.get(API_ENDPOINTS.EXECUTE.HISTORY(hostId));
    logger.info('Command history fetched successfully', {
      hostId,
      count: response.data?.data?.length,
    });
    return response.data;
  } catch (error) {
    return handleApiError<Command[]>(error, 'getCommandHistory');
  }
}

export async function getSavedCommands(hostId: number): Promise<ApiResult<Command[]>> {
  try {
    logger.info('Fetching saved commands', { hostId });
    const response = await api.get(API_ENDPOINTS.EXECUTE.SAVED(hostId));
    logger.info('Saved commands fetched successfully', {
      hostId,
      count: response.data?.data?.length,
    });
    return response.data;
  } catch (error) {
    return handleApiError<Command[]>(error, 'getSavedCommands');
  }
}

export async function saveCommand(
  hostId: number,
  command: Command,
): Promise<ApiResult<Command>> {
  try {
    logger.info('Saving command', {
      hostId,
      command: command.command,
      workingDirectory: command.workingDirectory,
    });
    const response = await api.post(
      API_ENDPOINTS.EXECUTE.SAVED(hostId),
      command,
    );
    logger.info('Command saved successfully', {
      hostId,
      command: command.command,
    });
    return response.data;
  } catch (error) {
    return handleApiError<Command>(error, 'saveCommand');
  }
}

export async function deleteSavedCommand(
  hostId: number,
  commandId: string,
): Promise<ApiResult<void>> {
  try {
    logger.info('Deleting saved command', { hostId, commandId });
    const response = await api.delete(
      API_ENDPOINTS.EXECUTE.SAVED_COMMAND(hostId, commandId),
    );
    logger.info('Saved command deleted successfully', { hostId, commandId });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'deleteSavedCommand');
  }
}
