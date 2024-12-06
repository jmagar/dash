import { LoggingManager } from '../../managers/LoggingManager';
import { LoggerAdapter } from '../../utils/logging/logger.adapter';
import { ApiError } from '../../../types/error';
import type { Host } from '../../../types/host';
import type { InstallOptions } from '../../../types/agent';
import type { Logger, LogMetadata } from '../../../types/logger';
import type { IAgentHandler } from './types';
import { unixInstallScript } from './install-scripts';

export class LinuxHandler implements IAgentHandler {
  private executeCommand: (host: Host, command: string, options?: { sudo?: boolean }) => Promise<void>;
  private copyFile: (host: Host, sourcePath: string, targetPath: string) => Promise<void>;
  private readonly logger: Logger;

  constructor(
    executeCommand: (host: Host, command: string, options?: { sudo?: boolean }) => Promise<void>,
    copyFile: (host: Host, sourcePath: string, targetPath: string) => Promise<void>
  ) {
    this.executeCommand = executeCommand;
    this.copyFile = copyFile;
    const baseLogger = LoggingManager.getInstance();
    this.logger = new LoggerAdapter(baseLogger, { component: 'LinuxAgentInstaller' });
  }

  async installAgent(host: Host, options: InstallOptions): Promise<void> {
    const logger = this.logger.withContext({ 
      hostId: host.id,
      operation: 'installAgent'
    });
    
    try {
      logger.info('Starting Linux agent installation', { options });
      
      const configPath = './config.json';
      await this.copyFile(host, configPath, './config.json');
      logger.debug('Config file copied', { path: configPath });

      if (options.installInContainer) {
        await this.installInContainer(host, options);
      } else {
        await this.installDirectly(host);
      }
      
      logger.info('Linux agent installation completed successfully');
    } catch (error: unknown) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        options
      };
      logger.error('Failed to install Linux agent', metadata);
      throw new ApiError('Failed to install Linux agent', 500);
    }
  }

  private async installInContainer(host: Host, options: InstallOptions): Promise<void> {
    const logger = this.logger.withContext({ 
      hostId: host.id, 
      containerName: options.containerName,
      operation: 'installInContainer'
    });

    try {
      logger.info('Starting container installation');

      const containerName = options.containerName || 'agent';
      const useHostNetwork = options.useHostNetwork ?? true;
      const mountHostPaths = options.mountHostPaths ?? true;

      const networkArg = useHostNetwork ? '--network host' : '';
      const volumeArgs = mountHostPaths ? '-v /:/host:ro' : '';

      const dockerCommand = `docker run -d --name ${containerName} ${networkArg} ${volumeArgs} agent:latest`;
      await this.executeCommand(host, dockerCommand, { sudo: true });
      
      logger.info('Container installation completed', {
        containerName,
        useHostNetwork,
        mountHostPaths
      });
    } catch (error: unknown) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        containerName: options.containerName
      };
      logger.error('Container installation failed', metadata);
      throw error;
    }
  }

  private async installDirectly(host: Host): Promise<void> {
    const logger = this.logger.withContext({ 
      hostId: host.id,
      operation: 'installDirectly'
    });

    try {
      logger.info('Starting direct installation');
      await this.executeCommand(host, unixInstallScript, { sudo: true });
      logger.info('Direct installation completed');
    } catch (error: unknown) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error)
      };
      logger.error('Direct installation failed', metadata);
      throw error;
    }
  }

  async uninstallAgent(host: Host): Promise<void> {
    const logger = this.logger.withContext({ 
      hostId: host.id,
      operation: 'uninstallAgent'
    });

    try {
      logger.info('Starting agent uninstallation');
      await this.executeCommand(host, 'systemctl stop agent && systemctl disable agent', { sudo: true });
      logger.info('Agent uninstallation completed');
    } catch (error: unknown) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error)
      };
      logger.error('Failed to uninstall Linux agent', metadata);
      throw new ApiError('Failed to uninstall Linux agent', 500);
    }
  }

  async startAgent(host: Host): Promise<void> {
    const logger = this.logger.withContext({ 
      hostId: host.id,
      operation: 'startAgent'
    });

    try {
      logger.info('Starting agent service');
      await this.executeCommand(host, 'systemctl start agent', { sudo: true });
      logger.info('Agent service started successfully');
    } catch (error: unknown) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error)
      };
      logger.error('Failed to start Linux agent', metadata);
      throw new ApiError('Failed to start Linux agent', 500);
    }
  }

  async stopAgent(host: Host): Promise<void> {
    const logger = this.logger.withContext({ 
      hostId: host.id,
      operation: 'stopAgent'
    });

    try {
      logger.info('Stopping agent service');
      await this.executeCommand(host, 'systemctl stop agent', { sudo: true });
      logger.info('Agent service stopped successfully');
    } catch (error: unknown) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error)
      };
      logger.error('Failed to stop Linux agent', metadata);
      throw new ApiError('Failed to stop Linux agent', 500);
    }
  }

  getInstallScript(): string {
    return unixInstallScript;
  }
}
