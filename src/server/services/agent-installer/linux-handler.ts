import path from 'path';
import { logger } from '../../utils/logger';
import type { LogMetadata } from '../../../types/logger';
import type { ExtendedHost, InstallOptions } from '../../../types/agent-config';
import { ApiError } from '../../../types/error';
import { unixInstallScript } from './install-scripts';
import { IAgentHandler } from './types';
import type { SSHService } from '../ssh.service';
import config from '../../config';

export class LinuxHandler implements IAgentHandler {
  private executeCommand: (host: ExtendedHost, command: string, options?: { sudo?: boolean }) => Promise<void>;
  private copyFile: (host: ExtendedHost, localPath: string, remotePath: string) => Promise<void>;
  private getBinaryPath: () => string;

  constructor(sshService: SSHService) {
    this.executeCommand = async (host: ExtendedHost, command: string, options: { sudo?: boolean } = {}) => {
      const sudoPrefix = options.sudo ? 'sudo ' : '';
      await sshService.executeCommand(host.hostname, `${sudoPrefix}${command}`);
    };
    
    this.copyFile = async (host: ExtendedHost, localPath: string, remotePath: string) => {
      await sshService.transferFile(host.hostname, localPath, remotePath);
    };

    this.getBinaryPath = () => {
      return config.paths.binaries;
    };
  }

  async installAgent(host: ExtendedHost, options: InstallOptions): Promise<void> {
    try {
      if (options.installInContainer) {
        await this.installInContainer(host, options);
      } else {
        await this.installOnHost(host);
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

  private async installInContainer(host: ExtendedHost, options: InstallOptions): Promise<void> {
    const containerName = options.containerName || 'shh-agent';
    const networkMode = options.useHostNetwork ? '--network host' : '';
    const volumeMounts = options.mountHostPaths ? '-v /:/host:ro' : '';

    await this.copyFile(host, './config.json', '/tmp/agent-config.json');
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

  private async installOnHost(host: ExtendedHost): Promise<void> {
    await this.copyFile(host, './config.json', '/etc/shh/config.json');
    await this.copyFile(
      host, 
      path.join(this.getBinaryPath(), 'shh-agent'),
      '/usr/local/bin/shh-agent'
    );
    await this.executeCommand(host, 'chmod +x /usr/local/bin/shh-agent', { sudo: true });
    await this.executeCommand(host, 'systemctl enable --now shh-agent', { sudo: true });
  }

  async uninstallAgent(host: ExtendedHost): Promise<void> {
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

  private async start(host: ExtendedHost): Promise<void> {
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

  private async stop(host: ExtendedHost): Promise<void> {
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

  getInstallScript(): string {
    return unixInstallScript;
  }
}
