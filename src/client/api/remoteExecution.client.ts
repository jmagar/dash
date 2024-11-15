import { api } from './api';
import { createApiError } from '../../types/error';
import type { CommandRequest, CommandResult } from '../../types/models-shared';
import { logger } from '../utils/frontendLogger';

const EXEC_ENDPOINTS = {
  EXECUTE: (hostId: number) => `/exec/${hostId}/execute`,
  CANCEL: (hostId: number) => `/exec/${hostId}/cancel`,
  STATUS: (hostId: number) => `/exec/${hostId}/status`,
} as const;

const COMMAND_ENDPOINTS = {
  COMMAND: (hostId: number) => `/hosts/${hostId}/commands`,
  SCRIPT: (hostId: number) => `/hosts/${hostId}/scripts`,
  HISTORY: (hostId: number) => `/hosts/${hostId}/history`,
  SAVED: (hostId: number) => `/hosts/${hostId}/saved`,
  DELETE_SAVED_COMMAND: (hostId: number, commandId: string) => `/hosts/${hostId}/saved/${commandId}`,
} as const;

export async function executeCommand(hostId: number, command: CommandRequest): Promise<CommandResult> {
  try {
    const response = await api.post<{ data: CommandResult }>(EXEC_ENDPOINTS.EXECUTE(hostId), command);
    return response.data.data;
  } catch (error) {
    logger.error('Failed to execute command:', {
      hostId,
      command,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to execute command', error, 400);
  }
}

export async function executeScript(
  hostId: number,
  script: string,
  args?: string[],
): Promise<string> {
  try {
    const response = await api.post<{ success: boolean; data: string }>(COMMAND_ENDPOINTS.SCRIPT(hostId), {
      script,
      args,
    });
    return response.data.data;
  } catch (error) {
    logger.error('Failed to execute script:', {
      script,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to execute script', error, 400);
  }
}

export async function getCommandHistory(hostId: number): Promise<string[]> {
  try {
    const response = await api.get<{ success: boolean; data: string[] }>(COMMAND_ENDPOINTS.HISTORY(hostId));
    return response.data.data;
  } catch (error) {
    logger.error('Failed to get command history:', {
      hostId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to get command history', error, 400);
  }
}

export async function getSavedCommands(hostId: number): Promise<CommandRequest[]> {
  try {
    const response = await api.get<{ success: boolean; data: CommandRequest[] }>(COMMAND_ENDPOINTS.SAVED(hostId));
    return response.data.data;
  } catch (error) {
    logger.error('Failed to get saved commands:', {
      hostId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to get saved commands', error, 400);
  }
}

export async function saveCommand(
  hostId: number,
  command: CommandRequest,
): Promise<void> {
  try {
    await api.post(COMMAND_ENDPOINTS.SAVED(hostId), command);
  } catch (error) {
    logger.error('Failed to save command:', {
      hostId,
      command: command.command,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to save command', error, 400);
  }
}

export async function deleteSavedCommand(
  hostId: number,
  commandId: string,
): Promise<void> {
  try {
    await api.delete(COMMAND_ENDPOINTS.DELETE_SAVED_COMMAND(hostId, commandId));
  } catch (error) {
    logger.error('Failed to delete saved command:', {
      hostId,
      commandId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to delete saved command', error, 400);
  }
}

export async function cancelCommand(hostId: number, commandId: string): Promise<void> {
  try {
    await api.post(EXEC_ENDPOINTS.CANCEL(hostId), { commandId });
  } catch (error) {
    logger.error('Failed to cancel command:', {
      hostId,
      commandId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to cancel command', error, 400);
  }
}

export async function getCommandStatus(hostId: number, commandId: string): Promise<CommandResult> {
  try {
    const response = await api.get<{ data: CommandResult }>(EXEC_ENDPOINTS.STATUS(hostId), {
      params: { commandId },
    });
    return response.data.data;
  } catch (error) {
    logger.error('Failed to get command status:', {
      hostId,
      commandId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to get command status', error, 404);
  }
}
