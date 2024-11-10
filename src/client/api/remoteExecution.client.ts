import axios from 'axios';

import { ApiResult, Command, CommandResult } from '../../types';
import { handleApiError, API_ENDPOINTS } from '../../types/api-shared';
import { BASE_URL } from '../config';

export async function executeCommand(
  hostId: number,
  command: Command,
): Promise<ApiResult<CommandResult>> {
  try {
    const response = await axios.post(
      `${BASE_URL}${API_ENDPOINTS.EXECUTE.COMMAND(hostId)}`,
      command,
    );
    return response.data;
  } catch (error) {
    return handleApiError<CommandResult>(error);
  }
}

export async function executeScript(
  hostId: number,
  script: string,
  args?: string[],
): Promise<ApiResult<CommandResult>> {
  try {
    const response = await axios.post(`${BASE_URL}${API_ENDPOINTS.EXECUTE.SCRIPT(hostId)}`, {
      script,
      args,
    });
    return response.data;
  } catch (error) {
    return handleApiError<CommandResult>(error);
  }
}

export async function getCommandHistory(hostId: number): Promise<ApiResult<Command[]>> {
  try {
    const response = await axios.get(`${BASE_URL}${API_ENDPOINTS.EXECUTE.HISTORY(hostId)}`);
    return response.data;
  } catch (error) {
    return handleApiError<Command[]>(error);
  }
}

export async function getSavedCommands(hostId: number): Promise<ApiResult<Command[]>> {
  try {
    const response = await axios.get(`${BASE_URL}${API_ENDPOINTS.EXECUTE.SAVED(hostId)}`);
    return response.data;
  } catch (error) {
    return handleApiError<Command[]>(error);
  }
}

export async function saveCommand(
  hostId: number,
  command: Command,
): Promise<ApiResult<Command>> {
  try {
    const response = await axios.post(
      `${BASE_URL}${API_ENDPOINTS.EXECUTE.SAVED(hostId)}`,
      command,
    );
    return response.data;
  } catch (error) {
    return handleApiError<Command>(error);
  }
}

export async function deleteSavedCommand(
  hostId: number,
  commandId: string,
): Promise<ApiResult<void>> {
  try {
    const response = await axios.delete(
      `${BASE_URL}${API_ENDPOINTS.EXECUTE.SAVED_COMMAND(hostId, commandId)}`,
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}
