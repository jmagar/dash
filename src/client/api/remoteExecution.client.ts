import { BaseApiClient } from './base.client';
import type { CommandRequest, CommandResult } from '../../types/models-shared';

const EXEC_ENDPOINTS = {
  EXECUTE: (hostId: string) => `/hosts/${hostId}/execute`,
  STREAM: (hostId: string) => `/hosts/${hostId}/stream`,
  KILL: (hostId: string, pid: number) => `/hosts/${hostId}/processes/${pid}/kill`,
  LIST: (hostId: string) => `/hosts/${hostId}/processes`,
  STATUS: (hostId: string, pid: number) => `/hosts/${hostId}/processes/${pid}`,
} as const;

class RemoteExecutionClient extends BaseApiClient {
  constructor() {
    super(EXEC_ENDPOINTS);
  }

  async executeCommand(hostId: string, command: CommandRequest): Promise<CommandResult> {
    const response = await this.post<CommandResult>(this.getEndpoint('EXECUTE', hostId), command);
    return response.data;
  }

  async streamCommand(hostId: string, command: string): Promise<void> {
    await this.post<void>(this.getEndpoint('STREAM', hostId), { command });
  }

  async killCommand(hostId: string, pid: number): Promise<void> {
    await this.post<void>(this.getEndpoint('KILL', hostId, pid));
  }

  async listProcesses(hostId: string): Promise<CommandResult[]> {
    const response = await this.get<CommandResult[]>(this.getEndpoint('LIST', hostId));
    return response.data;
  }

  async getProcessStatus(hostId: string, pid: number): Promise<CommandResult> {
    const response = await this.get<CommandResult>(this.getEndpoint('STATUS', hostId, pid));
    return response.data;
  }
}

export const remoteExecutionClient = new RemoteExecutionClient();

// Bind methods to avoid unbound method issues
export const executeCommand = remoteExecutionClient.executeCommand.bind(remoteExecutionClient);
export const streamCommand = remoteExecutionClient.streamCommand.bind(remoteExecutionClient);
export const killCommand = remoteExecutionClient.killCommand.bind(remoteExecutionClient);
export const listProcesses = remoteExecutionClient.listProcesses.bind(remoteExecutionClient);
export const getProcessStatus = remoteExecutionClient.getProcessStatus.bind(remoteExecutionClient);
