import { BaseApiClient, type Endpoint, type EndpointParams } from './base.client';

// Basic types until we create proper shared DTOs
interface CommandRequest {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
}

interface CommandResult {
  pid: number;
  exitCode?: number;
  stdout: string;
  stderr: string;
  error?: string;
  status: 'running' | 'completed' | 'failed';
}

type RemoteExecutionEndpoints = Record<string, Endpoint> & {
  EXECUTE: Endpoint;
  STREAM: Endpoint;
  KILL: Endpoint;
  LIST: Endpoint;
  STATUS: Endpoint;
};

const EXEC_ENDPOINTS: RemoteExecutionEndpoints = {
  EXECUTE: (...args: EndpointParams[]) => `/hosts/${args[0]}/execute`,
  STREAM: (...args: EndpointParams[]) => `/hosts/${args[0]}/stream`,
  KILL: (...args: EndpointParams[]) => `/hosts/${args[0]}/processes/${args[1]}/kill`,
  LIST: (...args: EndpointParams[]) => `/hosts/${args[0]}/processes`,
  STATUS: (...args: EndpointParams[]) => `/hosts/${args[0]}/processes/${args[1]}`,
};

class RemoteExecutionClient extends BaseApiClient<RemoteExecutionEndpoints> {
  constructor() {
    super(EXEC_ENDPOINTS);
  }

  async executeCommand(hostId: string, command: CommandRequest): Promise<CommandResult> {
    const response = await this.post<CommandResult>(
      this.getEndpoint('EXECUTE', hostId),
      command
    );

    if (!response.data) {
      throw new Error('Failed to execute command');
    }

    return response.data;
  }

  async streamCommand(hostId: string, command: string): Promise<void> {
    const response = await this.post<void>(
      this.getEndpoint('STREAM', hostId),
      { command }
    );

    if (!response.success) {
      throw new Error('Failed to stream command');
    }
  }

  async killCommand(hostId: string, pid: number): Promise<void> {
    const response = await this.post<void>(
      this.getEndpoint('KILL', hostId, pid)
    );

    if (!response.success) {
      throw new Error('Failed to kill command');
    }
  }

  async listProcesses(hostId: string): Promise<CommandResult[]> {
    const response = await this.get<CommandResult[]>(
      this.getEndpoint('LIST', hostId)
    );

    if (!response.data) {
      throw new Error('Failed to list processes');
    }

    return response.data;
  }

  async getProcessStatus(hostId: string, pid: number): Promise<CommandResult> {
    const response = await this.get<CommandResult>(
      this.getEndpoint('STATUS', hostId, pid)
    );

    if (!response.data) {
      throw new Error('Failed to get process status');
    }

    return response.data;
  }
}

// Create a single instance
const remoteExecutionClient = new RemoteExecutionClient();

// Export bound methods
export const {
  executeCommand,
  streamCommand,
  killCommand,
  listProcesses,
  getProcessStatus,
} = remoteExecutionClient;
