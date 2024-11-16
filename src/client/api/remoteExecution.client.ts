import type { ApiResponse } from '../../types/express';
import type { CommandRequest, CommandResult } from '../../types/models-shared';
import { api } from './api';
import { createApiError } from '../../types/error';
import { logger } from '../utils/frontendLogger';

const EXEC_ENDPOINTS = {
  EXECUTE: (hostId: string) => `/hosts/${hostId}/execute`,
  STREAM: (hostId: string) => `/hosts/${hostId}/stream`,
  KILL: (hostId: string, pid: number) => `/hosts/${hostId}/processes/${pid}/kill`,
  LIST: (hostId: string) => `/hosts/${hostId}/processes`,
  STATUS: (hostId: string, pid: number) => `/hosts/${hostId}/processes/${pid}`,
} as const;

export async function executeCommand(hostId: string, command: CommandRequest): Promise<CommandResult> {
  try {
    const response = await api.post<CommandResult>(EXEC_ENDPOINTS.EXECUTE(hostId), command);

    return response.data;
  } catch (error) {
    logger.error('Failed to execute command:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      hostId,
      command,
    });
    throw createApiError('Failed to execute command', error);
  }
}

export async function streamCommand(hostId: string, command: string): Promise<void> {
  try {
    await api.post(EXEC_ENDPOINTS.STREAM(hostId), {
      command,
    });
  } catch (error) {
    logger.error('Failed to stream command:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      hostId,
      command,
    });
    throw createApiError('Failed to stream command', error);
  }
}

export async function killCommand(hostId: string, pid: number): Promise<void> {
  try {
    await api.post(EXEC_ENDPOINTS.KILL(hostId, pid));
  } catch (error) {
    logger.error('Failed to kill command:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      hostId,
      pid,
    });
    throw createApiError('Failed to kill command', error);
  }
}

export async function listProcesses(hostId: string): Promise<CommandResult[]> {
  try {
    const response = await api.get<CommandResult[]>(EXEC_ENDPOINTS.LIST(hostId));

    return response.data;
  } catch (error) {
    logger.error('Failed to list processes:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      hostId,
    });
    throw createApiError('Failed to list processes', error);
  }
}

export async function getProcessStatus(hostId: string, pid: number): Promise<CommandResult> {
  try {
    const response = await api.get<CommandResult>(EXEC_ENDPOINTS.STATUS(hostId, pid));

    return response.data;
  } catch (error) {
    logger.error('Failed to get process status:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      hostId,
      pid,
    });
    throw createApiError('Failed to get process status', error);
  }
}
