import { BaseService, type ServiceMetrics } from './base.service';
import { getAgentService } from './agent.service';
import { ApiError } from '../../types/error';
import type { LogMetadata } from '../../types/logger';

interface DockerMetrics {
  containers: number;
  containersRunning: number;
  containersPaused: number;
  containersStopped: number;
  images: number;
  memTotal: number;
  numCPU: number;
  serverVersion: string;
}

interface DockerContainerMetrics {
  id: string;
  name: string;
  image: string;
  ports: Array<{
    hostPort: number;
    containerPort: number;
    protocol: string;
  }>;
  env: Array<{
    key: string;
    value: string;
  }>;
  command: string[];
  status: string;
  created: string;
  state: string;
}

interface DockerCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface DockerInfoJson {
  Containers: number;
  ContainersRunning: number;
  ContainersPaused: number;
  ContainersStopped: number;
  Images: number;
  MemTotal: number;
  NumCPU: number;
  ServerVersion: string;
}

interface DockerContainerJson {
  ID: string;
  Names: string;
  Image: string;
  Ports: string;
  Env: string;
  Command: string | string[];
  Status: string;
  Created: string;
  State: string;
}

export class DockerService extends BaseService {
  constructor() {
    super({
      metricsEnabled: true,
      loggingEnabled: true,
      validation: {
        strict: true
      }
    });
  }

  override getMetrics(): ServiceMetrics {
    const baseMetrics = super.getMetrics();
    return {
      ...baseMetrics,
      operationCount: baseMetrics.operationCount,
      errorCount: baseMetrics.errorCount,
      uptime: baseMetrics.uptime
    };
  }

  async getDockerMetrics(hostId: string): Promise<DockerMetrics> {
    const info = await this.executeCommand(hostId, 'docker info --format "{{json .}}"');
    if (!info.stdout) {
      const metadata: LogMetadata = {
        error: 'Empty docker info result',
        component: 'DockerService',
        operation: 'getDockerMetrics',
        hostId
      };
      this.handleError(new Error('Empty docker info result'), metadata);
    }
    
    let infoJson: DockerInfoJson;
    try {
      infoJson = JSON.parse(info.stdout) as DockerInfoJson;
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        component: 'DockerService',
        operation: 'getDockerMetrics',
        hostId
      };
      this.handleError(new ApiError('Failed to parse Docker info JSON', error instanceof Error ? error : new Error(String(error)), 500), metadata);
    }

    return {
      containers: infoJson.Containers || 0,
      containersRunning: infoJson.ContainersRunning || 0,
      containersPaused: infoJson.ContainersPaused || 0,
      containersStopped: infoJson.ContainersStopped || 0,
      images: infoJson.Images || 0,
      memTotal: infoJson.MemTotal || 0,
      numCPU: infoJson.NumCPU || 0,
      serverVersion: infoJson.ServerVersion || ''
    };
  }

  async getContainers(hostId: string): Promise<DockerContainerMetrics[]> {
    const psResult = await this.executeCommand(hostId, 'docker ps -a --format "{{json .}}"');
    if (!psResult.stdout) {
      return [];
    }

    try {
      return psResult.stdout
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          try {
            const container = JSON.parse(line.trim()) as DockerContainerJson;
            return {
              id: container.ID || '',
              name: container.Names || '',
              image: this.parseImageName(container.Image || ''),
              ports: this.parsePorts(container.Ports || ''),
              env: this.parseEnv(container.Env || ''),
              command: this.parseCommand(container.Command),
              status: container.Status || '',
              created: container.Created || '',
              state: container.State || ''
            };
          } catch (error) {
            const metadata: LogMetadata = {
              error: error instanceof Error ? error.message : String(error),
              component: 'DockerService',
              operation: 'getContainers',
              containerId: line,
              hostId
            };
            this.handleError(new ApiError('Failed to parse container data', error instanceof Error ? error : new Error(String(error)), 500), metadata);
          }
        })
        .filter((container): container is DockerContainerMetrics => container !== null);
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        component: 'DockerService',
        operation: 'getContainers',
        hostId
      };
      this.handleError(new ApiError('Failed to get Docker containers', error instanceof Error ? error : new Error(String(error)), 500), metadata);
    }
  }

  private parseImageName(image: string): string {
    return image.split(':')[0] || '';
  }

  private parsePorts(portsStr: string): Array<{ hostPort: number; containerPort: number; protocol: string }> {
    if (!portsStr) return [];
    
    return portsStr.split(', ').map(portMapping => {
      const [hostPart, containerPart] = portMapping.split('->');
      const [, hostPort] = (hostPart || '').split(':');
      const [containerPort, protocol] = (containerPart || '').split('/');
      
      return {
        hostPort: parseInt(hostPort || '0', 10),
        containerPort: parseInt(containerPort || '0', 10),
        protocol: protocol || 'tcp'
      };
    });
  }

  private parseEnv(envStr: string): Array<{ key: string; value: string }> {
    if (!envStr) return [];
    return envStr.split(',').map(env => {
      const [key = '', value = ''] = env.split('=');
      return { key, value };
    });
  }

  private parseCommand(command: unknown): string[] {
    if (Array.isArray(command)) {
      return command.map(String);
    }
    if (typeof command === 'string') {
      return command.split(' ');
    }
    return [];
  }

  private async executeCommand(hostId: string, command: string): Promise<DockerCommandResult> {
    const agentService = getAgentService();
    const result = await agentService.executeCommand(hostId, command);
    
    if (!this.isCommandResult(result)) {
      const metadata: LogMetadata = {
        error: 'Invalid command result',
        component: 'DockerService',
        operation: 'executeCommand',
        hostId
      };
      this.handleError(new ApiError('Invalid command result', 500), metadata);
    }
    
    return result;
  }

  private isCommandResult(value: unknown): value is DockerCommandResult {
    return value !== null && 
           typeof value === 'object' &&
           'stdout' in value &&
           typeof value.stdout === 'string' &&
           'stderr' in value &&
           typeof value.stderr === 'string' &&
           'exitCode' in value &&
           typeof value.exitCode === 'number';
  }
}
