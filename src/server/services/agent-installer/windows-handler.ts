import path from 'path';
import { logger } from '../../utils/logger';
import type { LogMetadata } from '../../../types/logger';
import type { ExtendedHost, InstallOptions } from '../../../types/agent';
import { ApiError } from '../../../types/error';
import { windowsInstallScript } from './install-scripts';
import { IAgentHandler } from './types';
import type { SSHService } from '../ssh.service';
import config from '../../config';

export class WindowsHandler implements IAgentHandler {
  private executeCommand: (host: ExtendedHost, command: string) => Promise<void>;
  private copyFile: (host: ExtendedHost, localPath: string, remotePath: string) => Promise<void>;
  private getBinaryPath: () => string;

  constructor(sshService: SSHService) {
    this.executeCommand = async (host: ExtendedHost, command: string) => {
      await sshService.executeCommand(host.hostname, command);
    };
    
    this.copyFile = async (host: ExtendedHost, localPath: string, remotePath: string) => {
      await sshService.transferFile(host.hostname, localPath, remotePath);
    };

    this.getBinaryPath = () => {
      return config.paths.binaries;
    };
  }

  async installAgent(host: ExtendedHost, _options: InstallOptions): Promise<void> {
    try {
      const configPath = './config.json';
      await this.copyFile(host, configPath, './config.json');
      await this.copyFile(
        host, 
        path.join(this.getBinaryPath(), 'shh-agent.exe'),
        'C:\\Program Files\\shh-agent\\shh-agent.exe'
      );
      await this.executeCommand(host, 'powershell -ExecutionPolicy Bypass -File install.ps1');
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        hostId: host.id,
        osType: host.os_type
      };
      logger.error('Failed to install Windows agent:', metadata);
      throw new ApiError('Failed to install Windows agent', 500);
    }
  }

  async uninstallAgent(host: ExtendedHost): Promise<void> {
    try {
      await this.executeCommand(host, 'sc.exe stop SHHAgent');
      await this.executeCommand(host, 'sc.exe delete SHHAgent');
      await this.executeCommand(host, 'rmdir /s /q "C:\\Program Files\\shh-agent"');
      await this.executeCommand(host, 'rmdir /s /q "C:\\ProgramData\\shh-agent"');
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        hostId: host.id
      };
      logger.error('Failed to uninstall Windows agent:', metadata);
      throw new ApiError('Failed to uninstall Windows agent', 500);
    }
  }

  private async start(host: ExtendedHost): Promise<void> {
    try {
      await this.executeCommand(host, 'sc.exe start SHHAgent');
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        hostId: host.id
      };
      logger.error('Failed to start Windows agent:', metadata);
      throw new ApiError('Failed to start Windows agent', 500);
    }
  }

  private async stop(host: ExtendedHost): Promise<void> {
    try {
      await this.executeCommand(host, 'sc.exe stop SHHAgent');
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        hostId: host.id
      };
      logger.error('Failed to stop Windows agent:', metadata);
      throw new ApiError('Failed to stop Windows agent', 500);
    }
  }

  getInstallScript(): string {
    return windowsInstallScript;
  }
}
