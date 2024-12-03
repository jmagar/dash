import { BaseService, type ServiceMetrics } from './base.service';
import { getAgentService } from './agent.service';
import { ApiError } from '../../types/error';
import { LoggingManager } from '../../../../../../../../../utils/logging/LoggingManager';

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
    try {
      const info = await this.executeCommand(hostId, 'docker info --format "{{json .}}"');
      if (!info.stdout) {
        throw new ApiError('Empty docker info result', 500);
      }
      
      let infoJson: Record<string, unknown>;
      try {
        infoJson = JSON.parse(info.stdout) as Record<string, unknown>;
      } catch (error) {
        this.handleError(new ApiError('Failed to parse Docker info JSON', error instanceof Error ? error : new Error(String(error)), 500));
      }

      return {
        containers: Number(infoJson.Containers) || 0,
        containersRunning: Number(infoJson.ContainersRunning) || 0,
        containersPaused: Number(infoJson.ContainersPaused) || 0,
        containersStopped: Number(infoJson.ContainersStopped) || 0,
        images: Number(infoJson.Images) || 0,
        memTotal: Number(infoJson.MemTotal) || 0,
        numCPU: Number(infoJson.NumCPU) || 0, // Docker API field for CPU count
        serverVersion: String(infoJson.ServerVersion) || ''
      };
    } catch (error) {
      this.handleError(new ApiError('Failed to get Docker metrics', error instanceof Error ? error : new Error(String(error)), 500));
    }
  }

  async getContainers(hostId: string): Promise<DockerContainerMetrics[]> {
    try {
      const psResult = await this.executeCommand(hostId, 'docker ps -a --format "{{json .}}"');
      if (!psResult.stdout) {
        return [];
      }

      return psResult.stdout
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          try {
            const container = JSON.parse(line.trim()) as Record<string, unknown>;
            return {
              id: String(container.ID || ''),
              name: String(container.Names || ''),
              image: this.parseImageName(String(container.Image || '')),
              ports: this.parsePorts(String(container.Ports || '')),
              env: this.parseEnv(String(container.Env || '')),
              command: this.parseCommand(container.Command),
              status: String(container.Status || ''),
              created: String(container.Created || ''),
              state: String(container.State || '')
            };
          } catch (error) {
            this.loggerLoggingManager.getInstance().()),
              line 
            });
            return null;
          }
        })
        .filter((container): container is DockerContainerMetrics => container !== null);
    } catch (error) {
      this.handleError(new ApiError('Failed to get Docker containers', error instanceof Error ? error : new Error(String(error)), 500));
    }
  }

  private parseImageName(image: string): string {
    return image.split(':')[0];
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
      throw new ApiError('Invalid command result', 500);
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

