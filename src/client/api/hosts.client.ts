import { BaseApiClient, type Endpoint, type EndpointParams } from './base.client';
import type { Host, SystemStats, CreateHostRequest } from '../../types/models-shared';

type HostEndpoints = Record<string, Endpoint> & {
  LIST: '/hosts';
  GET: Endpoint;
  CREATE: '/hosts';
  UPDATE: Endpoint;
  DELETE: Endpoint;
  TEST: '/hosts/test';
  STATS: Endpoint;
  CONNECT: Endpoint;
  DISCONNECT: Endpoint;
  STATUS: Endpoint;
};

const HOST_ENDPOINTS: HostEndpoints = {
  LIST: '/hosts',
  GET: (...args: EndpointParams[]) => `/hosts/${args[0]}`,
  CREATE: '/hosts',
  UPDATE: (...args: EndpointParams[]) => `/hosts/${args[0]}`,
  DELETE: (...args: EndpointParams[]) => `/hosts/${args[0]}`,
  TEST: '/hosts/test',
  STATS: (...args: EndpointParams[]) => `/hosts/${args[0]}/stats`,
  CONNECT: (...args: EndpointParams[]) => `/hosts/${args[0]}/connect`,
  DISCONNECT: (...args: EndpointParams[]) => `/hosts/${args[0]}/disconnect`,
  STATUS: (...args: EndpointParams[]) => `/hosts/${args[0]}/status`,
};

class HostsClient extends BaseApiClient<HostEndpoints> {
  private static instance: HostsClient;

  private constructor() {
    super(HOST_ENDPOINTS);
  }

  public static getInstance(): HostsClient {
    if (!HostsClient.instance) {
      HostsClient.instance = new HostsClient();
    }
    return HostsClient.instance;
  }

  async listHosts(): Promise<Host[]> {
    const response = await this.get<Host[]>(this.getEndpoint('LIST'));
    
    if (!response.data) {
      throw new Error('Failed to list hosts');
    }

    return response.data;
  }

  async getHost(hostId: string): Promise<Host> {
    const response = await this.get<Host>(this.getEndpoint('GET', hostId));
    
    if (!response.data) {
      throw new Error(`Failed to get host with ID: ${hostId}`);
    }

    return response.data;
  }

  async createHost(host: CreateHostRequest): Promise<Host> {
    const response = await this.post<Host>(this.getEndpoint('CREATE'), host);
    
    if (!response.data) {
      throw new Error('Failed to create host');
    }

    return response.data;
  }

  async updateHost(hostId: string, host: Partial<Host>): Promise<Host> {
    const response = await this.put<Host>(this.getEndpoint('UPDATE', hostId), host);
    
    if (!response.data) {
      throw new Error(`Failed to update host with ID: ${hostId}`);
    }

    return response.data;
  }

  async deleteHost(hostId: string): Promise<void> {
    const response = await this.delete<void>(this.getEndpoint('DELETE', hostId));
    
    if (!response.success) {
      throw new Error(`Failed to delete host with ID: ${hostId}`);
    }
  }

  async testHost(host: CreateHostRequest): Promise<boolean> {
    const response = await this.post<{ success: boolean }>(this.getEndpoint('TEST'), host);
    
    if (!response.data) {
      throw new Error('Failed to test host connection');
    }

    return response.data.success;
  }

  async getHostStats(hostId: string): Promise<SystemStats> {
    const response = await this.get<SystemStats>(this.getEndpoint('STATS', hostId));
    
    if (!response.data) {
      throw new Error(`Failed to get stats for host with ID: ${hostId}`);
    }

    return response.data;
  }

  async connectHost(hostId: string): Promise<void> {
    const response = await this.post<void>(this.getEndpoint('CONNECT', hostId));
    
    if (!response.success) {
      throw new Error(`Failed to connect to host with ID: ${hostId}`);
    }
  }

  async disconnectHost(hostId: string): Promise<void> {
    const response = await this.post<void>(this.getEndpoint('DISCONNECT', hostId));
    
    if (!response.success) {
      throw new Error(`Failed to disconnect from host with ID: ${hostId}`);
    }
  }

  async getHostStatus(hostId: string): Promise<Host> {
    const response = await this.get<Host>(this.getEndpoint('STATUS', hostId));
    
    if (!response.data) {
      throw new Error(`Failed to get status for host with ID: ${hostId}`);
    }

    return response.data;
  }
}

export const hostsClient = HostsClient.getInstance();

// Export methods directly from the singleton instance
export const {
  listHosts,
  getHost,
  createHost,
  updateHost,
  deleteHost,
  testHost,
  getHostStats,
  connectHost,
  disconnectHost,
  getHostStatus,
} = hostsClient;
