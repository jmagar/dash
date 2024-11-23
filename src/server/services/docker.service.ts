import Docker from 'dockerode';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { BaseService } from './base.service';
import type { Container, ContainerInfo, Network, Volume } from 'dockerode';
import type { LogMetadata } from '../../types/logger';

export interface DockerConfig {
  socketPath?: string;
  host?: string;
  port?: number;
  ca?: string;
  cert?: string;
  key?: string;
}

export class DockerService extends BaseService {
  private readonly docker: Docker;

  constructor(config: DockerConfig = {}) {
    super();
    this.docker = new Docker(config);
  }

  // Container Operations
  async listContainers(all = false) {
    try {
      return await this.docker.listContainers({ all });
    } catch (error) {
      this.handleError(error, { operation: 'list_containers' });
      throw error;
    }
  }

  async getContainer(id: string) {
    try {
      return this.docker.getContainer(id);
    } catch (error) {
      this.handleError(error, { operation: 'get_container', containerId: id });
      throw error;
    }
  }

  async createContainer(options: Docker.ContainerCreateOptions) {
    try {
      return await this.docker.createContainer(options);
    } catch (error) {
      this.handleError(error, { operation: 'create_container', options });
      throw error;
    }
  }

  // Image Operations
  async listImages() {
    try {
      return await this.docker.listImages();
    } catch (error) {
      this.handleError(error, { operation: 'list_images' });
      throw error;
    }
  }

  async pullImage(repoTag: string) {
    try {
      await new Promise((resolve, reject) => {
        this.docker.pull(repoTag, (err: Error | null, stream: NodeJS.ReadableStream) => {
          if (err) {
            reject(err);
            return;
          }

          this.docker.modem.followProgress(stream, (err: Error | null) => {
            if (err) {
              reject(err);
            } else {
              resolve(undefined);
            }
          });
        });
      });
    } catch (error) {
      this.handleError(error, { operation: 'pull_image', repoTag });
      throw error;
    }
  }

  // Network Operations
  async listNetworks() {
    try {
      return await this.docker.listNetworks();
    } catch (error) {
      this.handleError(error, { operation: 'list_networks' });
      throw error;
    }
  }

  async createNetwork(options: Docker.NetworkCreateOptions) {
    try {
      return await this.docker.createNetwork(options);
    } catch (error) {
      this.handleError(error, { operation: 'create_network', options });
      throw error;
    }
  }

  // Volume Operations
  async listVolumes() {
    try {
      return await this.docker.listVolumes();
    } catch (error) {
      this.handleError(error, { operation: 'list_volumes' });
      throw error;
    }
  }

  async createVolume(options: Docker.VolumeCreateOptions) {
    try {
      return await this.docker.createVolume(options);
    } catch (error) {
      this.handleError(error, { operation: 'create_volume', options });
      throw error;
    }
  }

  // Utility Operations
  async getInfo() {
    try {
      return await this.docker.info();
    } catch (error) {
      this.handleError(error, { operation: 'get_info' });
      throw error;
    }
  }

  async getVersion() {
    try {
      return await this.docker.version();
    } catch (error) {
      this.handleError(error, { operation: 'get_version' });
      throw error;
    }
  }

  // Event Streaming
  async streamEvents(callback: (event: any) => void) {
    try {
      const stream = await this.docker.getEvents();
      stream.on('data', (chunk) => {
        try {
          const event = JSON.parse(chunk.toString());
          callback(event);
        } catch (error) {
          this.handleError(error, { operation: 'parse_event' });
        }
      });

      stream.on('error', (error) => {
        this.handleError(error, { operation: 'stream_events' });
      });

      return stream;
    } catch (error) {
      this.handleError(error, { operation: 'stream_events' });
      throw error;
    }
  }

  // Resource Cleanup
  async cleanup(): Promise<void> {
    try {
      const containers = await this.listContainers(true);
      for (const container of containers) {
        if (container.Labels['managed-by'] === 'dash') {
          const containerInstance = this.docker.getContainer(container.Id);
          if (container.State === 'running') {
            await containerInstance.stop();
          }
          await containerInstance.remove();
        }
      }

      const volumes = await this.listVolumes();
      for (const volume of volumes.Volumes) {
        if (volume.Labels && volume.Labels['managed-by'] === 'dash') {
          const volumeInstance = this.docker.getVolume(volume.Name);
          await volumeInstance.remove();
        }
      }

      const networks = await this.listNetworks();
      for (const network of networks) {
        if (network.Labels && network.Labels['managed-by'] === 'dash') {
          const networkInstance = this.docker.getNetwork(network.Id);
          await networkInstance.remove();
        }
      }
    } catch (error) {
      this.handleError(error, { operation: 'cleanup' });
      throw error;
    }
  }
}

// Export singleton instance
let dockerServiceInstance: DockerService | null = null;

export function getDockerService(config?: DockerConfig): DockerService {
  if (!dockerServiceInstance) {
    dockerServiceInstance = new DockerService(config);
  }
  return dockerServiceInstance;
}
