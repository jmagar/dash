import path from 'path';
import { logger } from '../../utils/logger';
import type { LogMetadata } from '../../../types/logger';
import type { ExtendedHost, InstallOptions } from '../../../types/agent';
import { ApiError } from '../../../types/error';
import { unixInstallScript } from './install-scripts';

export class LinuxAgentHandler {
  constructor(
    private executeCommand: (host: ExtendedHost, command: string, options?: { sudo?: boolean }) => Promise<void>,
    private copyFile: (host: ExtendedHost, localPath: string, remotePath: string) => Promise<void>,
    private getBinaryPath: () => string
  ) {}

  async install(host: ExtendedHost, configPath: string, options: InstallOptions): Promise<void> {
    try {
      if (options.installInContainer) {
        await this.installInContainer(host, configPath, options);
      } else {
        await this.installOnHost(host, configPath);
      }
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        hostId: host.id,
        osType: host.os_type,
        options
      };
      logger.error('Failed to install Linux agent:', metadata);
      throw new ApiError('Failed to install Linux agent', 500);
    }
  }

  private async installInContainer(
    host: ExtendedHost, 
    configPath: string, 
    options: InstallOptions
  ): Promise<void> {
    const containerName = options.containerName || 'shh-agent';
    const networkMode = options.useHostNetwork ? '--network host' : '';
    const volumeMounts = options.mountHostPaths ? '-v /:/host:ro' : '';

    await this.copyFile(host, configPath, '/tmp/agent-config.json');
    await this.executeCommand(
      host,
      `docker run -d \
        --name ${containerName} \
        ${networkMode} \
        ${volumeMounts} \
        -v /tmp/agent-config.json:/etc/shh/config.json \
        shh-agent:latest`
    );
  }

  private async installOnHost(host: ExtendedHost, configPath: string): Promise<void> {
    await this.copyFile(host, configPath, '/etc/shh/config.json');
    await this.copyFile(
      host, 
      path.join(this.getBinaryPath(), 'shh-agent'),
      '/usr/local/bin/shh-agent'
    );
    await this.executeCommand(host, 'chmod +x /usr/local/bin/shh-agent', { sudo: true });
    await this.executeCommand(host, 'systemctl enable --now shh-agent', { sudo: true });
  }

  async start(host: ExtendedHost): Promise<void> {
    try {
      await this.executeCommand(host, 'systemctl daemon-reload', { sudo: true });
      await this.executeCommand(host, 'systemctl enable shh-agent', { sudo: true });
      await this.executeCommand(host, 'systemctl start shh-agent', { sudo: true });
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        hostId: host.id
      };
      logger.error('Failed to start Linux agent:', metadata);
      throw new ApiError('Failed to start Linux agent', 500);
    }
  }

  async stop(host: ExtendedHost): Promise<void> {
    try {
      await this.executeCommand(host, 'systemctl stop shh-agent', { sudo: true });
      await this.executeCommand(host, 'systemctl disable shh-agent', { sudo: true });
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        hostId: host.id
      };
      logger.error('Failed to stop Linux agent:', metadata);
      throw new ApiError('Failed to stop Linux agent', 500);
    }
  }

  async uninstall(host: ExtendedHost): Promise<void> {
    try {
      await this.executeCommand(host, 'systemctl stop shh-agent', { sudo: true });
      await this.executeCommand(host, 'systemctl disable shh-agent', { sudo: true });
      await this.executeCommand(host, 'rm -rf /usr/local/bin/shh-agent /etc/shh', { sudo: true });
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        hostId: host.id
      };
      logger.error('Failed to uninstall Linux agent:', metadata);
      throw new ApiError('Failed to uninstall Linux agent', 500);
    }
  }

  getInstallScript(): string {
    return unixInstallScript;
  }
}
