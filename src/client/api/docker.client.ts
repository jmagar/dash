import { BaseApiClient, type Endpoint, type EndpointParams } from './base.client';
import { ApiError } from './api';
import { logger } from '../utils/frontendLogger';
import type { DockerContainer, ContainerState } from '../../types/docker';

interface ContainerStats {
  cpu: {
    usage: number;
    system: number;
    user: number;
  };
  memory: {
    usage: number;
    limit: number;
    max: number;
  };
  network: {
    rx_bytes: number;
    tx_bytes: number;
  };
  timestamp: string;
}

interface ContainerInspect {
  id: string;
  name: string;
  image: string;
  created: string;
  config: {
    hostname: string;
    domainname: string;
    user: string;
    env: string[];
    cmd: string[];
    workingDir: string;
    labels: Record<string, string>;
  };
  networkSettings: {
    ipAddress: string;
    gateway: string;
    ports: Record<string, Array<{ hostIp: string; hostPort: string }>>;
  };
  state: {
    status: ContainerState;
    running: boolean;
    paused: boolean;
    restarting: boolean;
    pid: number;
    exitCode: number;
    error: string;
    startedAt: string;
    finishedAt: string;
  };
  hostId: string;
}

interface ContainerLogs {
  stdout: string;
  stderr: string;
}

interface ContainerCreateOptions {
  image: string;
  name?: string;
  env?: Array<string>;
  cmd?: Array<string>;
  ports?: Array<{
    hostPort: number;
    containerPort: number;
    protocol?: string;
  }>;
  volumes?: Array<{
    hostPath: string;
    containerPath: string;
  }>;
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

  async listContainers(): Promise<DockerContainer[]> {
    try {
      logger.info('Listing containers');
      const response = await this.get<DockerContainer[]>(
        this.getEndpoint('LIST')
      );

      if (!response.data) {
        throw new ApiError({
          message: 'Failed to list containers',
          code: 'DOCKER_LIST_FAILED'
        });
      }

      return response.data;
    } catch (error) {
      logger.error('Failed to list containers', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error instanceof ApiError ? error : new ApiError({
        message: 'Failed to list containers',
        code: 'DOCKER_LIST_FAILED'
      });
    }
  }

  async createContainer(options: ContainerCreateOptions): Promise<DockerContainer> {
    try {
      logger.info('Creating container', options);
      const response = await this.post<DockerContainer>(
        this.getEndpoint('CREATE'),
        options
      );

      if (!response.data) {
        throw new ApiError({
          message: 'Failed to create container',
          code: 'DOCKER_CREATE_FAILED',
          data: options
        });
      }

      return response.data;
    } catch (error) {
      logger.error('Failed to create container', {
        error: error instanceof Error ? error.message : String(error),
        options
      });
      throw error instanceof ApiError ? error : new ApiError({
        message: 'Failed to create container',
        code: 'DOCKER_CREATE_FAILED',
        data: options
      });
    }
  }

  async startContainer(id: string, options?: ContainerStartOptions): Promise<void> {
    try {
      logger.info('Starting container', { id, options });
      const response = await this.post<void>(
        this.getEndpoint('START', id),
        options
      );

      if (!response.success) {
        throw new ApiError({
          message: 'Failed to start container',
          code: 'DOCKER_START_FAILED',
          data: { id, options }
        });
      }
    } catch (error) {
      logger.error('Failed to start container', {
        error: error instanceof Error ? error.message : String(error),
        id,
        options
      });
      throw error instanceof ApiError ? error : new ApiError({
        message: 'Failed to start container',
        code: 'DOCKER_START_FAILED',
        data: { id, options }
      });
    }
  }

  async stopContainer(id: string, options?: ContainerStopOptions): Promise<void> {
    try {
      logger.info('Stopping container', { id, options });
      const response = await this.post<void>(
        this.getEndpoint('STOP', id),
        options
      );

      if (!response.success) {
        throw new ApiError({
          message: 'Failed to stop container',
          code: 'DOCKER_STOP_FAILED',
          data: { id, options }
        });
      }
    } catch (error) {
      logger.error('Failed to stop container', {
        error: error instanceof Error ? error.message : String(error),
        id,
        options
      });
      throw error instanceof ApiError ? error : new ApiError({
        message: 'Failed to stop container',
        code: 'DOCKER_STOP_FAILED',
        data: { id, options }
      });
    }
  }

  async restartContainer(id: string): Promise<void> {
    try {
      logger.info('Restarting container', { id });
      const response = await this.post<void>(
        this.getEndpoint('RESTART', id)
      );

      if (!response.success) {
        throw new ApiError({
          message: 'Failed to restart container',
          code: 'DOCKER_RESTART_FAILED',
          data: { id }
        });
      }
    } catch (error) {
      logger.error('Failed to restart container', {
        error: error instanceof Error ? error.message : String(error),
        id
      });
      throw error instanceof ApiError ? error : new ApiError({
        message: 'Failed to restart container',
        code: 'DOCKER_RESTART_FAILED',
        data: { id }
      });
    }
  }

  async removeContainer(id: string): Promise<void> {
    try {
      logger.info('Removing container', { id });
      const response = await this.delete<void>(
        this.getEndpoint('REMOVE', id)
      );

      if (!response.success) {
        throw new ApiError({
          message: 'Failed to remove container',
          code: 'DOCKER_REMOVE_FAILED',
          data: { id }
        });
      }
    } catch (error) {
      logger.error('Failed to remove container', {
        error: error instanceof Error ? error.message : String(error),
        id
      });
      throw error instanceof ApiError ? error : new ApiError({
        message: 'Failed to remove container',
        code: 'DOCKER_REMOVE_FAILED',
        data: { id }
      });
    }
  }

  async inspectContainer(id: string): Promise<ContainerInspect> {
    try {
      logger.info('Inspecting container', { id });
      const response = await this.get<ContainerInspect>(
        this.getEndpoint('INSPECT', id)
      );

      if (!response.data) {
        throw new ApiError({
          message: 'Failed to inspect container',
          code: 'DOCKER_INSPECT_FAILED',
          data: { id }
        });
      }

      return response.data;
    } catch (error) {
      logger.error('Failed to inspect container', {
        error: error instanceof Error ? error.message : String(error),
        id
      });
      throw error instanceof ApiError ? error : new ApiError({
        message: 'Failed to inspect container',
        code: 'DOCKER_INSPECT_FAILED',
        data: { id }
      });
    }
  }

  async getContainerStats(id: string): Promise<ContainerStats> {
    try {
      logger.info('Getting container stats', { id });
      const response = await this.get<ContainerStats>(
        this.getEndpoint('STATS', id)
      );

      if (!response.data) {
        throw new ApiError({
          message: 'Failed to get container stats',
          code: 'DOCKER_STATS_FAILED',
          data: { id }
        });
      }

      return response.data;
    } catch (error) {
      logger.error('Failed to get container stats', {
        error: error instanceof Error ? error.message : String(error),
        id
      });
      throw error instanceof ApiError ? error : new ApiError({
        message: 'Failed to get container stats',
        code: 'DOCKER_STATS_FAILED',
        data: { id }
      });
    }
  }

  async getContainerLogs(id: string): Promise<ContainerLogs> {
    try {
      logger.info('Getting container logs', { id });
      const response = await this.get<ContainerLogs>(
        this.getEndpoint('LOGS', id)
      );

      if (!response.data) {
        throw new ApiError({
          message: 'Failed to get container logs',
          code: 'DOCKER_LOGS_FAILED',
          data: { id }
        });
      }

      return response.data;
    } catch (error) {
      logger.error('Failed to get container logs', {
        error: error instanceof Error ? error.message : String(error),
        id
      });
      throw error instanceof ApiError ? error : new ApiError({
        message: 'Failed to get container logs',
        code: 'DOCKER_LOGS_FAILED',
        data: { id }
      });
    }
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

// Export types
export type {
  ContainerCreateOptions,
  ContainerStartOptions,
  ContainerStopOptions,
  ContainerStats,
  ContainerInspect,
  ContainerLogs
};
