import { Service } from '../core/service';
import { getAgentService } from './agent.service';
import { getExecutionService } from './execution.service';
import {
  DockerServiceMetrics,
  DockerContainerMetrics,
  DockerVolumeMetrics,
  DockerNetworkMetrics,
  DockerEventMetrics,
  DockerError,
  DockerConfig,
  DockerContainerCreateOptions,
} from './docker.types';

export class DockerService extends Service {
  constructor() {
    super();
  }

  async getMetrics(hostId: string): Promise<DockerServiceMetrics> {
    try {
      const agentService = getAgentService();
      const result = await agentService.executeCommand(hostId, 'docker info --format "{{json .}}"');
      const info = JSON.parse(result.stdout);
      
      return {
        containers: info.Containers,
        containersRunning: info.ContainersRunning,
        containersPaused: info.ContainersPaused,
        containersStopped: info.ContainersStopped,
        images: info.Images,
        memoryLimit: info.MemTotal,
        cpuTotal: info.NCPU,
        version: info.ServerVersion,
      };
    } catch (error) {
      throw this.handleError('Failed to get Docker metrics', error);
    }
  }

  async listContainers(hostId: string, all = false): Promise<DockerContainerMetrics[]> {
    try {
      const agentService = getAgentService();
      const result = await agentService.executeCommand(
        hostId,
        `docker ps ${all ? '-a' : ''} --format "{{json .}}"`
      );
      
      return result.stdout
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          const container = JSON.parse(line);
          return {
            id: container.ID,
            name: container.Names,
            image: container.Image,
            status: container.Status,
            state: container.State,
            created: container.CreatedAt,
            ports: this.parsePorts(container.Ports),
            networks: container.Networks?.split(',') || [],
            mounts: [],
            labels: {},
          };
        });
    } catch (error) {
      throw this.handleError('Failed to list containers', error);
    }
  }

  async createContainer(hostId: string, options: DockerContainerCreateOptions): Promise<{ id: string }> {
    try {
      const agentService = getAgentService();
      const args = ['create'];
      
      if (options.name) {
        args.push('--name', options.name);
      }

      if (options.Env?.length) {
        options.Env.forEach(env => args.push('-e', env));
      }

      if (options.HostConfig?.Binds?.length) {
        options.HostConfig.Binds.forEach(bind => args.push('-v', bind));
      }

      if (options.HostConfig?.PortBindings) {
        Object.entries(options.HostConfig.PortBindings).forEach(([containerPort, hostPorts]) => {
          hostPorts.forEach(({ HostPort }) => {
            args.push('-p', `${HostPort}:${containerPort}`);
          });
        });
      }

      if (options.HostConfig?.RestartPolicy?.Name) {
        args.push('--restart', options.HostConfig.RestartPolicy.Name);
      }

      args.push(options.Image);

      if (options.Cmd?.length) {
        args.push(...options.Cmd);
      }

      const result = await agentService.executeCommand(hostId, 'docker', args);
      return { id: result.stdout.trim() };
    } catch (error) {
      throw this.handleError('Failed to create container', error);
    }
  }

  async startContainer(hostId: string, id: string): Promise<void> {
    try {
      const agentService = getAgentService();
      await agentService.executeCommand(hostId, 'docker', ['start', id]);
    } catch (error) {
      throw this.handleError(`Failed to start container ${id}`, error);
    }
  }

  async stopContainer(hostId: string, id: string): Promise<void> {
    try {
      const agentService = getAgentService();
      await agentService.executeCommand(hostId, 'docker', ['stop', id]);
    } catch (error) {
      throw this.handleError(`Failed to stop container ${id}`, error);
    }
  }

  async removeContainer(hostId: string, id: string, force = false): Promise<void> {
    try {
      const agentService = getAgentService();
      const args = ['rm'];
      if (force) {
        args.push('-f');
      }
      args.push(id);
      await agentService.executeCommand(hostId, 'docker', args);
    } catch (error) {
      throw this.handleError(`Failed to remove container ${id}`, error);
    }
  }

  private parsePorts(portsString: string): Array<{
    IP?: string;
    PrivatePort: number;
    PublicPort?: number;
    Type: string;
  }> {
    if (!portsString) {
      return [];
    }

    return portsString.split(', ').map(portMapping => {
      const [hostPart, containerPart] = portMapping.split('->');
      const [hostIp, hostPort] = (hostPart || '').split(':');
      const [containerPort, proto] = (containerPart || hostPart).split('/');

      return {
        IP: hostIp || undefined,
        PrivatePort: parseInt(containerPort, 10),
        PublicPort: hostPort ? parseInt(hostPort, 10) : undefined,
        Type: proto || 'tcp',
      };
    });
  }

  private handleError(message: string, error: unknown): DockerError {
    const dockerError: DockerError = {
      code: 'DOCKER_ERROR',
      message: message,
      details: error,
    };
    this.logger.error(message, { error });
    return dockerError;
  }
}
