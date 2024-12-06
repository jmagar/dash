import { BaseApiClient, type Endpoint, type EndpointParams } from './base.client';
import type { ProcessInfo, ProcessStats } from '../../types/process';
import type { ApiResponse } from '../../types/express';

type ProcessEndpoints = Record<string, Endpoint> & {
  LIST: Endpoint;
  STATS: Endpoint;
  START: Endpoint;
  STOP: Endpoint;
  KILL: Endpoint;
};

const PROCESS_ENDPOINTS: ProcessEndpoints = {
  LIST: (...args: EndpointParams[]) => `/api/process/${args[0]}/list`,
  STATS: (...args: EndpointParams[]) => `/api/process/${args[0]}/stats/${args[1]}`,
  START: (...args: EndpointParams[]) => `/api/process/${args[0]}/start`,
  STOP: (...args: EndpointParams[]) => `/api/process/${args[0]}/stop/${args[1]}`,
  KILL: (...args: EndpointParams[]) => `/api/process/${args[0]}/kill/${args[1]}`
};

class ProcessApiClient extends BaseApiClient<ProcessEndpoints> {
  private static instance: ProcessApiClient;

  private constructor() {
    super(PROCESS_ENDPOINTS);
  }

  public static getInstance(): ProcessApiClient {
    if (!ProcessApiClient.instance) {
      ProcessApiClient.instance = new ProcessApiClient();
    }
    return ProcessApiClient.instance;
  }

  public async listProcesses(hostId: string): Promise<ApiResponse<ProcessInfo[]>> {
    return this.get(this.getEndpoint('LIST', hostId));
  }

  public async getProcessStats(hostId: string, processId: string): Promise<ApiResponse<ProcessStats>> {
    return this.get(this.getEndpoint('STATS', hostId, processId));
  }

  public async startProcess(hostId: string, command: string): Promise<ApiResponse<ProcessInfo>> {
    return this.post(this.getEndpoint('START', hostId), { command });
  }

  public async stopProcess(hostId: string, processId: string): Promise<ApiResponse<void>> {
    return this.post(this.getEndpoint('STOP', hostId, processId));
  }

  public async killProcess(hostId: string, processId: string): Promise<ApiResponse<void>> {
    return this.post(this.getEndpoint('KILL', hostId, processId));
  }
}

export const processApi = ProcessApiClient.getInstance();
