import axios from 'axios';

import type { ApiResult } from '../types';
import { handleApiError, API_ENDPOINTS, BASE_URL } from '../types/api';
import type { Command, CommandResult } from '../types/models';

interface CommandHistory extends CommandResult {
  timestamp: Date;
}

export const executeCommand = async (
  hostId: number,
  command: string,
  options?: Partial<Command>,
): Promise<ApiResult<CommandResult>> => {
  try {
    const { data } = await axios.post<CommandResult>(
      `${BASE_URL}${API_ENDPOINTS.EXECUTE.COMMAND(hostId)}`,
      {
        command,
        ...options,
      },
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<CommandResult>(error);
  }
};

export const getCommandHistory = async (hostId: number): Promise<ApiResult<CommandHistory[]>> => {
  try {
    const { data } = await axios.get<CommandHistory[]>(
      `${BASE_URL}${API_ENDPOINTS.EXECUTE.HISTORY(hostId)}`,
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<CommandHistory[]>(error);
  }
};

export const clearCommandHistory = async (hostId: number): Promise<ApiResult<void>> => {
  try {
    await axios.delete(`${BASE_URL}${API_ENDPOINTS.EXECUTE.HISTORY(hostId)}`);
    return {
      success: true,
    };
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const saveCommand = async (
  hostId: number,
  name: string,
  command: string,
): Promise<ApiResult<void>> => {
  try {
    await axios.post(
      `${BASE_URL}${API_ENDPOINTS.EXECUTE.SAVED(hostId)}`,
      {
        name,
        command,
      },
    );
    return {
      success: true,
    };
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const getSavedCommands = async (hostId: number): Promise<ApiResult<Array<{
  id: string;
  name: string;
  command: string;
}>>> => {
  try {
    const { data } = await axios.get(
      `${BASE_URL}${API_ENDPOINTS.EXECUTE.SAVED(hostId)}`,
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<Array<{
      id: string;
      name: string;
      command: string;
    }>>(error);
  }
};

export const deleteSavedCommand = async (hostId: number, commandId: string): Promise<ApiResult<void>> => {
  try {
    await axios.delete(
      `${BASE_URL}${API_ENDPOINTS.EXECUTE.SAVED_COMMAND(hostId, commandId)}`,
    );
    return {
      success: true,
    };
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const executeScript = async (
  hostId: number,
  script: string,
  options?: {
    interpreter?: string;
    args?: string[];
    env?: Record<string, string>;
  },
): Promise<ApiResult<CommandResult>> => {
  try {
    const { data } = await axios.post<CommandResult>(
      `${BASE_URL}${API_ENDPOINTS.EXECUTE.SCRIPT(hostId)}`,
      {
        script,
        ...options,
      },
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<CommandResult>(error);
  }
};
