import { BaseService } from './base.service';
import { getAgentService } from './agent.service';
import type {
  DockerServiceMetrics,
  DockerContainerMetrics,
  DockerContainerCreateOptions,
  DockerInfo,
  DockerCommandResult
} from './docker.types';
import { ApiError } from '../../types/api-error';

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

  async getInfo(hostId: string): Promise<DockerInfo> {
    try {
      const result = await this.executeCommand(hostId, 'docker info --format "{{json .}}"');
      if (!result.stdout) {
        throw new ApiError('Empty docker info result', 500);
      }
      const info = this.parseJsonSafe<DockerInfo>(result.stdout);
      if (!this.isDockerInfo(info)) {
        throw new ApiError('Invalid docker info format', 500);
      }
      return info;
    } catch (error) {
      throw this.handleError(error, { operation: 'docker_info', hostId });
    }
  }

  async getDockerMetrics(hostId: string): Promise<DockerServiceMetrics> {
    try {
      const info = await this.getInfo(hostId);
      return {
        containers: info.Containers,
        containersRunning: info.ContainersRunning,
        containersPaused: info.ContainersPaused,
        containersStopped: info.ContainersStopped,
        images: info.Images,
        memoryTotal: info.MemTotal,
        cpuCount: info.NCPU,
        version: info.ServerVersion
      };
    } catch (error) {
      throw this.handleError(error, { operation: 'getDockerMetrics', hostId });
    }
  }

  async listContainers(hostId: string, all = false): Promise<DockerContainerMetrics[]> {
    try {
      const result = await this.executeCommand(hostId, `docker ps ${all ? '-a' : ''} --format "{{json .}}"`);
      const containers = result.stdout
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          const container = this.parseJsonSafe<unknown>(line);
          if (!this.isDockerContainer(container)) {
            throw new ApiError('Invalid container format', 500);
          }
          return this.mapToContainerMetrics(container);
        });

      return containers;
    } catch (error) {
      throw this.handleError(error, { operation: 'listContainers', hostId, all });
    }
  }

  async createContainer(hostId: string, options: DockerContainerCreateOptions): Promise<{ id: string }> {
    try {
      const args: string[] = ['create'];

      if (options.name) {
        args.push('--name', options.name);
      }

      if (options.ports) {
        Object.entries(options.ports).forEach(([host, container]) => {
          args.push('-p', `${host}:${container}`);
        });
      }

      if (options.env) {
        Object.entries(options.env).forEach(([key, value]) => {
          args.push('-e', `${key}=${value}`);
        });
      }

      args.push(options.image);

      if (options.command) {
        args.push(...Array.from(options.command));
      }

      const result = await this.executeDockerCommand(hostId, args);
      const containerId = result.stdout.trim();
      if (!containerId) {
        throw new ApiError('Empty container ID returned', 500);
      }

      return { id: containerId };
    } catch (error) {
      throw this.handleError(error, { operation: 'createContainer', hostId, options });
    }
  }

  async startContainer(hostId: string, id: string): Promise<void> {
    try {
      await this.executeCommand(hostId, `docker start ${id}`);
    } catch (error) {
      this.handleError(error, { operation: 'startContainer', hostId, containerId: id });
    }
  }

  async stopContainer(hostId: string, id: string): Promise<void> {
    try {
      await this.executeCommand(hostId, `docker stop ${id}`);
    } catch (error) {
      this.handleError(error, { operation: 'stopContainer', hostId, containerId: id });
    }
  }

  async removeContainer(hostId: string, id: string, force = false): Promise<void> {
    try {
      const args = ['rm'];
      if (force) {
        args.push('-f');
      }
      args.push(id);
      await getAgentService().executeCommand(hostId, 'docker', args);
    } catch (error) {
      this.handleError(error, { operation: 'removeContainer', hostId, containerId: id, force });
    }
  }

  private async executeCommand(hostId: string, command: string): Promise<DockerCommandResult> {
    const agentService = getAgentService();
    const result = await agentService.executeCommand(hostId, command);
    
    if (!this.isCommandResult(result)) {
      throw new ApiError('Invalid command result', 500);
    }
    
    return result;
  }

  private async executeDockerCommand(hostId: string, args: string[]): Promise<DockerCommandResult> {
    const agentService = getAgentService();
    const result = await agentService.executeCommand(hostId, 'docker', args);
    
    if (!this.isCommandResult(result)) {
      throw new ApiError('Invalid command result', 500);
    }
    
    return result;
  }

  private isDockerInfo(value: unknown): value is DockerInfo {
    return value !== null && typeof value === 'object' &&
      'Containers' in value && typeof value.Containers === 'number' &&
      'ContainersRunning' in value && typeof value.ContainersRunning === 'number' &&
      'ContainersPaused' in value && typeof value.ContainersPaused === 'number' &&
      'ContainersStopped' in value && typeof value.ContainersStopped === 'number' &&
      'Images' in value && typeof value.Images === 'number' &&
      'MemTotal' in value && typeof value.MemTotal === 'number' &&
      'NCPU' in value && typeof value.NCPU === 'number' &&
      'ServerVersion' in value && typeof value.ServerVersion === 'string';
  }

  private isCommandResult(value: unknown): value is DockerCommandResult {
    return value !== null && typeof value === 'object' &&
      'stdout' in value && typeof value.stdout === 'string' &&
      'stderr' in value && typeof value.stderr === 'string' &&
      'exitCode' in value && typeof value.exitCode === 'number';
  }

  private isDockerContainer(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' &&
      'ID' in value && typeof value.ID === 'string' &&
      'Names' in value && typeof value.Names === 'string' &&
      'Image' in value && typeof value.Image === 'string' &&
      'Status' in value && typeof value.Status === 'string' &&
      'State' in value && typeof value.State === 'string' &&
      'Created' in value && typeof value.Created === 'number';
  }

  private mapToContainerMetrics(container: Record<string, unknown>): DockerContainerMetrics {
    return {
      id: container.ID as string,
      name: container.Names as string,
      image: container.Image as string,
      status: container.Status as string,
      state: container.State as string,
      created: container.Created as number,
      ports: this.parsePortsString(String(container.Ports || '')),
      networks: this.parseNetworksString(String(container.Networks || ''))
    };
  }

  private parseJsonSafe<T>(str: string): unknown {
    try {
      return JSON.parse(str);
    } catch {
      throw new ApiError('Invalid JSON format', 500);
    }
  }

  private parsePortsString(portsStr: string): DockerContainerMetrics['ports'] {
    if (!portsStr) {
      return [];
    }
    
    interface DockerPort {
      IP?: string;
      PrivatePort: number;
      PublicPort?: number;
      Type: string;
    }
    
    try {
      const parsed: unknown = JSON.parse(portsStr);
      if (!Array.isArray(parsed)) {
        return [];
      }
      
      return parsed.filter((item): item is DockerPort => {
        if (!item || typeof item !== 'object') {
          return false;
        }
        
        const port = item as Record<string, unknown>;
        
        if ('IP' in port && typeof port.IP !== 'string') {
          return false;
        }
        
        if (!('PrivatePort' in port) || typeof port.PrivatePort !== 'number') {
          return false;
        }
        
        if ('PublicPort' in port && typeof port.PublicPort !== 'number') {
          return false;
        }
        
        if (!('Type' in port) || typeof port.Type !== 'string') {
          return false;
        }
        
        return true;
      });
    } catch {
      return [];
    }
  }

  private parseNetworksString(networksStr: string): string[] {
    if (!networksStr) {
      return [];
    }
    return networksStr.split(',').map(n => n.trim()).filter(Boolean);
  }

  private parsePorts(portsString: string): Array<{
    IP?: string;
    PrivatePort: number;
    PublicPort?: number;
    Type: string;
  }> {
    if (!portsString) return [];
    
    // Parse the ports string format: "0.0.0.0:8080->80/tcp"
    return portsString.split(', ').map(portMapping => {
      const [hostPart, containerPart] = portMapping.split('->');
      const [hostIp, hostPort] = (hostPart || '').split(':');
      const [containerPort, type] = (containerPart || '').split('/');

      return {
        IP: hostIp || undefined,
        PrivatePort: parseInt(containerPort, 10) || 0,
        PublicPort: hostPort ? parseInt(hostPort, 10) : undefined,
        Type: type || 'tcp'
      };
    });
  }
}
