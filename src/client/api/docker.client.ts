import { BaseApiClient, type Endpoint, type EndpointParams } from './base.client';
import type { ApiResponse } from '../../types/express';

// Basic types until we create proper shared DTOs
interface Container {
  id: string;
  name: string;
  status: string;
}

interface ContainerStats {
  cpu: number;
  memory: number;
}

interface ContainerLogs {
  stdout: string;
  stderr: string;
}

interface ContainerInspect {
  id: string;
  name: string;
  config: Record<string, unknown>;
}

interface ContainerCreateOptions {
  image: string;
  name?: string;
}

interface ContainerStartOptions {
  detach?: boolean;
}

interface ContainerStopOptions {
  timeout?: number;
}

type DockerEndpoints = Record<string, Endpoint> & {
  LIST: '/api/docker/containers';
  CREATE: '/api/docker/containers/create';
  START: Endpoint;
  STOP: Endpoint;
  RESTART: Endpoint;
  REMOVE: Endpoint;
  INSPECT: Endpoint;
  STATS: Endpoint;
  LOGS: Endpoint;
};

const DOCKER_ENDPOINTS: DockerEndpoints = {
  LIST: '/api/docker/containers',
  CREATE: '/api/docker/containers/create',
  START: (...args: EndpointParams[]) => `/api/docker/containers/${args[0]}/start`,
  STOP: (...args: EndpointParams[]) => `/api/docker/containers/${args[0]}/stop`,
  RESTART: (...args: EndpointParams[]) => `/api/docker/containers/${args[0]}/restart`,
  REMOVE: (...args: EndpointParams[]) => `/api/docker/containers/${args[0]}/remove`,
  INSPECT: (...args: EndpointParams[]) => `/api/docker/containers/${args[0]}/inspect`,
  STATS: (...args: EndpointParams[]) => `/api/docker/containers/${args[0]}/stats`,
  LOGS: (...args: EndpointParams[]) => `/api/docker/containers/${args[0]}/logs`,
};

class DockerClient extends BaseApiClient<DockerEndpoints> {
  constructor() {
    super(DOCKER_ENDPOINTS);
  }

  async listContainers(): Promise<Container[]> {
    const response = await this.get<Container[]>(
      this.getEndpoint('LIST')
    );

    if (!response.data) {
      throw new Error('Failed to list containers');
    }

    return response.data;
  }

  async createContainer(options: ContainerCreateOptions): Promise<Container> {
    const response = await this.post<Container>(
      this.getEndpoint('CREATE'),
      options
    );

    if (!response.data) {
      throw new Error('Failed to create container');
    }

    return response.data;
  }

  async startContainer(id: string, options?: ContainerStartOptions): Promise<void> {
    const response = await this.post<void>(
      this.getEndpoint('START', id),
      options
    );

    if (!response.success) {
      throw new Error('Failed to start container');
    }
  }

  async stopContainer(id: string, options?: ContainerStopOptions): Promise<void> {
    const response = await this.post<void>(
      this.getEndpoint('STOP', id),
      options
    );

    if (!response.success) {
      throw new Error('Failed to stop container');
    }
  }

  async restartContainer(id: string): Promise<void> {
    const response = await this.post<void>(
      this.getEndpoint('RESTART', id)
    );

    if (!response.success) {
      throw new Error('Failed to restart container');
    }
  }

  async removeContainer(id: string): Promise<void> {
    const response = await this.delete<void>(
      this.getEndpoint('REMOVE', id)
    );

    if (!response.success) {
      throw new Error('Failed to remove container');
    }
  }

  async inspectContainer(id: string): Promise<ContainerInspect> {
    const response = await this.get<ContainerInspect>(
      this.getEndpoint('INSPECT', id)
    );

    if (!response.data) {
      throw new Error('Failed to inspect container');
    }

    return response.data;
  }

  async getContainerStats(id: string): Promise<ContainerStats> {
    const response = await this.get<ContainerStats>(
      this.getEndpoint('STATS', id)
    );

    if (!response.data) {
      throw new Error('Failed to get container stats');
    }

    return response.data;
  }

  async getContainerLogs(id: string): Promise<ContainerLogs> {
    const response = await this.get<ContainerLogs>(
      this.getEndpoint('LOGS', id)
    );

    if (!response.data) {
      throw new Error('Failed to get container logs');
    }

    return response.data;
  }
}

// Create a single instance
const dockerClient = new DockerClient();

// Export bound methods
export const {
  listContainers,
  createContainer,
  startContainer,
  stopContainer,
  restartContainer,
  removeContainer,
  inspectContainer,
  getContainerStats,
  getContainerLogs,
} = dockerClient;
