import { LoggingManager } from '../../managers/LoggingManager';
import { LoggerAdapter } from '../../utils/logging/logger.adapter';
import { ApiError } from '../../../types/error';
import type { Host } from '../../../types/host';
import type { InstallOptions } from '../../../types/agent';
import type { Logger, LogMetadata } from '../../../types/logger';
import type { IAgentHandler } from './types';
import { windowsInstallScript } from './install-scripts';

export class WindowsHandler implements IAgentHandler {
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
    this.logger = new LoggerAdapter(baseLogger, { component: 'WindowsAgentInstaller' });
  }

  async installAgent(host: Host, options: InstallOptions): Promise<void> {
    const logger = this.logger.withContext({ 
      hostId: host.id,
      operation: 'installAgent'
    });
    
    try {
      logger.info('Starting Windows agent installation', { options });
      
      const configPath = '.\\config.json';
      await this.copyFile(host, configPath, '.\\config.json');
      logger.debug('Config file copied', { path: configPath });

      await this.executeCommand(host, windowsInstallScript);
      logger.info('Windows agent installation completed successfully');
    } catch (error: unknown) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        options
      };
      logger.error('Failed to install Windows agent', metadata);
      throw new ApiError('Failed to install Windows agent', 500);
    }
  }

  async uninstallAgent(host: Host): Promise<void> {
    const logger = this.logger.withContext({ 
      hostId: host.id,
      operation: 'uninstallAgent'
    });

    try {
      logger.info('Starting agent uninstallation');
      await this.executeCommand(host, 'net stop AgentService && sc delete AgentService');
      logger.info('Agent uninstallation completed');
    } catch (error: unknown) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error)
      };
      logger.error('Failed to uninstall Windows agent', metadata);
      throw new ApiError('Failed to uninstall Windows agent', 500);
    }
  }

  async startAgent(host: Host): Promise<void> {
    const logger = this.logger.withContext({ 
      hostId: host.id,
      operation: 'startAgent'
    });

    try {
      logger.info('Starting agent service');
      await this.executeCommand(host, 'net start AgentService');
      logger.info('Agent service started successfully');
    } catch (error: unknown) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error)
      };
      logger.error('Failed to start Windows agent', metadata);
      throw new ApiError('Failed to start Windows agent', 500);
    }
  }

  async stopAgent(host: Host): Promise<void> {
    const logger = this.logger.withContext({ 
      hostId: host.id,
      operation: 'stopAgent'
    });

    try {
      logger.info('Stopping agent service');
      await this.executeCommand(host, 'net stop AgentService');
      logger.info('Agent service stopped successfully');
    } catch (error: unknown) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error)
      };
      logger.error('Failed to stop Windows agent', metadata);
      throw new ApiError('Failed to stop Windows agent', 500);
    }
  }

  getInstallScript(): string {
    return windowsInstallScript;
  }
}
