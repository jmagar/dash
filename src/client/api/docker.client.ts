import { BaseApiClient } from './base.client';
import type { DockerContainer, DockerStats, DockerNetwork, DockerVolume, DockerComposeConfig } from '../../types/docker';
import type { ApiResponse } from '../../types/express';

// Define the actual endpoint types for internal use
type DockerEndpointFn = (...args: string[]) => string;
type DockerEndpoints = Record<string, string | DockerEndpointFn>;

const DOCKER_ENDPOINTS: DockerEndpoints = {
  CONTAINERS: (hostId: string) => `/docker/${hostId}/containers`,
  CONTAINER: (hostId: string, id: string) => `/docker/${hostId}/containers/${id}`,
  STATS: (hostId: string, id: string) => `/docker/${hostId}/containers/${id}/stats`,
  LOGS: (hostId: string, id: string) => `/docker/${hostId}/containers/${id}/logs`,
  NETWORKS: (hostId: string) => `/docker/${hostId}/networks`,
  VOLUMES: (hostId: string) => `/docker/${hostId}/volumes`,
  STACKS: (hostId: string) => `/docker/${hostId}/stacks`,
  STACK: (hostId: string, name: string) => `/docker/${hostId}/stacks/${name}`,
};

class DockerClient extends BaseApiClient {
  constructor() {
    // Cast to match BaseApiClient's expected type while preserving functionality
    super(DOCKER_ENDPOINTS);
  }

  listContainers = async (hostId: string): Promise<DockerContainer[]> => {
    const response = await this.get<DockerContainer[]>(this.getEndpoint('CONTAINERS', hostId));
    if (!response.data) {
      return [];
    }
    return response.data.map((container) => ({
      ...container,
      created: container.created,
      name: container.name || '',
      id: container.id,
      hostId: container.hostId,
      image: container.image,
      command: container.command,
      state: container.state,
      status: container.status,
      ports: container.ports,
      mounts: container.mounts,
      networks: container.networks,
      labels: container.labels,
      createdAt: container.createdAt,
      updatedAt: container.updatedAt
    }));
  };

  getContainerStats = async (hostId: string, containerId: string): Promise<DockerStats> => {
    const response = await this.get<DockerStats>(this.getEndpoint('STATS', hostId, containerId));
    if (!response.data) {
      throw new Error('Failed to get container stats');
    }
    return response.data;
  };

  startContainer = async (hostId: string, containerId: string): Promise<void> => {
    await this.post<void>(`${this.getEndpoint('CONTAINER', hostId, containerId)}/start`);
  };

  stopContainer = async (hostId: string, containerId: string): Promise<void> => {
    await this.post<void>(`${this.getEndpoint('CONTAINER', hostId, containerId)}/stop`);
  };

  restartContainer = async (hostId: string, containerId: string): Promise<void> => {
    await this.post<void>(`${this.getEndpoint('CONTAINER', hostId, containerId)}/restart`);
  };

  removeContainer = async (hostId: string, containerId: string): Promise<void> => {
    await this.delete<void>(this.getEndpoint('CONTAINER', hostId, containerId));
  };

  listNetworks = async (hostId: string): Promise<DockerNetwork[]> => {
    const response = await this.get<DockerNetwork[]>(this.getEndpoint('NETWORKS', hostId));
    if (!response.data) {
      return [];
    }
    return response.data;
  };

  listVolumes = async (hostId: string): Promise<DockerVolume[]> => {
    const response = await this.get<DockerVolume[]>(this.getEndpoint('VOLUMES', hostId));
    if (!response.data) {
      return [];
    }
    return response.data;
  };

  getContainerLogs = async (hostId: string, containerId: string): Promise<string> => {
    const response = await this.get<string>(this.getEndpoint('LOGS', hostId, containerId));
    if (!response.data) {
      return '';
    }
    return response.data;
  };

  getStacks = async (hostId: string): Promise<DockerComposeConfig[]> => {
    const response = await this.get<DockerComposeConfig[]>(this.getEndpoint('STACKS', hostId));
    if (!response.data) {
      return [];
    }
    return response.data;
  };

  createStack = async (hostId: string, name: string, composeFile: string): Promise<void> => {
    await this.post<void>(this.getEndpoint('STACKS', hostId), { name, composeFile });
  };

  deleteStack = async (hostId: string, stackName: string): Promise<void> => {
    await this.delete<void>(this.getEndpoint('STACK', hostId, stackName));
  };

  startStack = async (hostId: string, stackName: string): Promise<void> => {
    await this.post<void>(`${this.getEndpoint('STACK', hostId, stackName)}/start`);
  };

  stopStack = async (hostId: string, stackName: string): Promise<void> => {
    await this.post<void>(`${this.getEndpoint('STACK', hostId, stackName)}/stop`);
  };

  getStackComposeFile = async (hostId: string, stackName: string): Promise<string> => {
    const response = await this.get<string>(`${this.getEndpoint('STACK', hostId, stackName)}/compose`);
    if (!response.data) {
      return '';
    }
    return response.data;
  };

  updateStackComposeFile = async (hostId: string, stackName: string, composeFile: string): Promise<void> => {
    await this.put<void>(`${this.getEndpoint('STACK', hostId, stackName)}/compose`, { composeFile });
  };
}

// Create a single instance
const dockerClient = new DockerClient();

// Export bound methods
export const listContainers = dockerClient.listContainers;
export const getContainerStats = dockerClient.getContainerStats;
export const startContainer = dockerClient.startContainer;
export const stopContainer = dockerClient.stopContainer;
export const restartContainer = dockerClient.restartContainer;
export const removeContainer = dockerClient.removeContainer;
export const listNetworks = dockerClient.listNetworks;
export const listVolumes = dockerClient.listVolumes;
export const getContainerLogs = dockerClient.getContainerLogs;
export const getStacks = dockerClient.getStacks;
export const createStack = dockerClient.createStack;
export const deleteStack = dockerClient.deleteStack;
export const startStack = dockerClient.startStack;
export const stopStack = dockerClient.stopStack;
export const getStackComposeFile = dockerClient.getStackComposeFile;
export const updateStackComposeFile = dockerClient.updateStackComposeFile;

// Export client instance
export { dockerClient };
