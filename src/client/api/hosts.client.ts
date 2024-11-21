import { BaseApiClient } from './base.client';
import type { Host, SystemStats, CreateHostRequest } from '../../types/models-shared';

const HOST_ENDPOINTS = {
  LIST: '/hosts',
  GET: (id: string) => `/hosts/${id}`,
  CREATE: '/hosts',
  UPDATE: (id: string) => `/hosts/${id}`,
  DELETE: (id: string) => `/hosts/${id}`,
  TEST: '/hosts/test',
  STATS: (id: string) => `/hosts/${id}/stats`,
  CONNECT: (id: string) => `/hosts/${id}/connect`,
  DISCONNECT: (id: string) => `/hosts/${id}/disconnect`,
  STATUS: (id: string) => `/hosts/${id}/status`,
} as const;

class HostsClient extends BaseApiClient {
  constructor() {
    super(HOST_ENDPOINTS);
  }

  async listHosts(): Promise<Host[]> {
    const response = await this.get<Host[]>(this.getEndpoint('LIST'));
    return response.data;
  }

  async getHost(hostId: string): Promise<Host> {
    const response = await this.get<Host>(this.getEndpoint('GET', hostId));
    return response.data;
  }

  async createHost(host: CreateHostRequest): Promise<Host> {
    const response = await this.post<Host>(this.getEndpoint('CREATE'), host);
    return response.data;
  }

  async updateHost(hostId: string, host: Partial<Host>): Promise<Host> {
    const response = await this.put<Host>(this.getEndpoint('UPDATE', hostId), host);
    return response.data;
  }

  async deleteHost(hostId: string): Promise<void> {
    await this.delete<void>(this.getEndpoint('DELETE', hostId));
  }

  async testHost(host: CreateHostRequest): Promise<boolean> {
    const response = await this.post<{ success: boolean }>(this.getEndpoint('TEST'), host);
    return response.data.success;
  }

  async getHostStats(hostId: string): Promise<SystemStats> {
    const response = await this.get<SystemStats>(this.getEndpoint('STATS', hostId));
    return response.data;
  }

  async connectHost(hostId: string): Promise<void> {
    await this.post<void>(this.getEndpoint('CONNECT', hostId));
  }

  async disconnectHost(hostId: string): Promise<void> {
    await this.post<void>(this.getEndpoint('DISCONNECT', hostId));
  }

  async getHostStatus(hostId: string): Promise<Host> {
    const response = await this.get<Host>(this.getEndpoint('STATUS', hostId));
    return response.data;
  }
}

export const hostsClient = new HostsClient();

// Bind methods to avoid unbound method issues
export const listHosts = hostsClient.listHosts.bind(hostsClient);
export const getHost = hostsClient.getHost.bind(hostsClient);
export const createHost = hostsClient.createHost.bind(hostsClient);
export const updateHost = hostsClient.updateHost.bind(hostsClient);
export const deleteHost = hostsClient.deleteHost.bind(hostsClient);
export const testHost = hostsClient.testHost.bind(hostsClient);
export const getHostStats = hostsClient.getHostStats.bind(hostsClient);
export const connectHost = hostsClient.connectHost.bind(hostsClient);
export const disconnectHost = hostsClient.disconnectHost.bind(hostsClient);
export const getHostStatus = hostsClient.getHostStatus.bind(hostsClient);
