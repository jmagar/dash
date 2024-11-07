import axios from 'axios';
import type { Command, CommandResult } from '../types/models';
import type { ApiResponse, ApiResult } from '../types/api';
import { handleApiError } from '../types/api';

const BASE_URL = process.env.REACT_APP_API_URL || '';

interface CommandHistory extends CommandResult {
  timestamp: Date;
}

export const executeCommand = async (
  hostId: number,
  command: string,
  options?: Partial<Command>
): ApiResult<CommandResult> => {
  try {
    const { data } = await axios.post<CommandResult>(`${BASE_URL}/api/execute/${hostId}`, {
      command,
      ...options,
    });
    return {
      success: true,
      data,
    } as ApiResponse<CommandResult>;
  } catch (error) {
    return handleApiError<CommandResult>(error);
  }
};

export const getCommandHistory = async (hostId: number): ApiResult<CommandHistory[]> => {
  try {
    const { data } = await axios.get<CommandHistory[]>(`${BASE_URL}/api/execute/${hostId}/history`);
    return {
      success: true,
      data,
    } as ApiResponse<CommandHistory[]>;
  } catch (error) {
    return handleApiError<CommandHistory[]>(error);
  }
};

export const clearCommandHistory = async (hostId: number): ApiResult<void> => {
  try {
    await axios.delete(`${BASE_URL}/api/execute/${hostId}/history`);
    return {
      success: true,
      data: undefined,
    } as ApiResponse<void>;
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const saveCommand = async (
  hostId: number,
  name: string,
  command: string
): ApiResult<void> => {
  try {
    await axios.post(`${BASE_URL}/api/execute/${hostId}/saved`, {
      name,
      command,
    });
    return {
      success: true,
      data: undefined,
    } as ApiResponse<void>;
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const getSavedCommands = async (hostId: number): ApiResult<Array<{
  id: string;
  name: string;
  command: string;
}>> => {
  try {
    const { data } = await axios.get(`${BASE_URL}/api/execute/${hostId}/saved`);
    return {
      success: true,
      data,
    } as ApiResponse<Array<{
      id: string;
      name: string;
      command: string;
    }>>;
  } catch (error) {
    return handleApiError<Array<{
      id: string;
      name: string;
      command: string;
    }>>(error);
  }
};

export const deleteSavedCommand = async (hostId: number, commandId: string): ApiResult<void> => {
  try {
    await axios.delete(`${BASE_URL}/api/execute/${hostId}/saved/${commandId}`);
    return {
      success: true,
      data: undefined,
    } as ApiResponse<void>;
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
  }
): ApiResult<CommandResult> => {
  try {
    const { data } = await axios.post<CommandResult>(`${BASE_URL}/api/execute/${hostId}/script`, {
      script,
      ...options,
    });
    return {
      success: true,
      data,
    } as ApiResponse<CommandResult>;
  } catch (error) {
    return handleApiError<CommandResult>(error);
  }
};
