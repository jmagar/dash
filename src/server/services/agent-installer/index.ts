import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { logger } from '../../utils/logger';
import type { LogMetadata } from '../../../types/logger';
import { sshService } from '../ssh.service';
import type { ExtendedHost, AgentConfig, InstallOptions } from '../../../types/agent';
import { db } from '../../db';
import { ApiError } from '../../../types/error';
import { config } from '../../config';
import { WindowsAgentHandler } from './windows-handler';
import { LinuxAgentHandler } from './linux-handler';

// Extend SSHService with transferFile method
declare module '../ssh.service' {
  interface SSHService {
    transferFile(hostname: string, localPath: string, remotePath: string): Promise<void>;
  }
}

class AgentInstallerService {
  private windowsHandler: WindowsAgentHandler;
  private linuxHandler: LinuxAgentHandler;

  constructor() {
    this.windowsHandler = new WindowsAgentHandler(
      this.executeCommand.bind(this),
      this.copyFile.bind(this),
      this.getBinaryPath.bind(this)
    );

    this.linuxHandler = new LinuxAgentHandler(
      this.executeCommand.bind(this),
      this.copyFile.bind(this),
      this.getBinaryPath.bind(this)
    );
  }

  private async executeCommand(host: ExtendedHost, command: string, options: { sudo?: boolean } = {}): Promise<void> {
    try {
      const sudoPrefix = options.sudo ? 'sudo ' : '';
      await sshService.executeCommand(host.hostname, `${sudoPrefix}${command}`);
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        command,
        hostname: host.hostname,
        hostId: host.id
      };
      logger.error('Failed to execute command', metadata);
      throw new ApiError('Failed to execute command on host', 500);
    }
  }

  private async copyFile(host: ExtendedHost, localPath: string, remotePath: string): Promise<void> {
    try {
      await sshService.transferFile(host.hostname, localPath, remotePath);
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        localPath,
        remotePath,
        hostname: host.hostname,
        hostId: host.id
      };
      logger.error('Failed to copy file', metadata);
      throw new ApiError('Failed to copy file to host', 500);
    }
  }

  private getBinaryPath(): string {
    const binaryPath = config.paths?.binaries;
    if (!binaryPath) {
      throw new ApiError('Binary path not configured', 500);
    }
    return binaryPath;
  }

  public async installAgent(host: ExtendedHost, options: InstallOptions = {}): Promise<void> {
    try {
      const agentConfig: AgentConfig = {
        server_url: config.server.websocketUrl,
        agent_id: host.id,
        labels: host.labels
      };

      const configPath = path.join(os.tmpdir(), 'config.json');
      await fs.writeFile(configPath, JSON.stringify(agentConfig, null, 2));

      if (host.os_type === 'windows') {
        await this.windowsHandler.install(host, configPath);
      } else {
        await this.linuxHandler.install(host, configPath, options);
      }

      await this.updateAgentStatus(host.id, true);

      const metadata: LogMetadata = {
        hostId: host.id,
        osType: host.os_type,
        options,
        status: 'success'
      };
      logger.info('Agent installed successfully', metadata);
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        hostId: host.id,
        osType: host.os_type,
        status: 'failed'
      };
      logger.error('Failed to install agent', metadata);
      throw new ApiError('Failed to install agent', 500);
    }
  }

  public async startAgent(host: ExtendedHost): Promise<void> {
    if (host.os_type === 'windows') {
      await this.windowsHandler.start(host);
    } else {
      await this.linuxHandler.start(host);
    }
  }

  public async stopAgent(host: ExtendedHost): Promise<void> {
    if (host.os_type === 'windows') {
      await this.windowsHandler.stop(host);
    } else {
      await this.linuxHandler.stop(host);
    }
  }

  public async uninstallAgent(host: ExtendedHost): Promise<void> {
    try {
      if (host.os_type === 'windows') {
        await this.windowsHandler.uninstall(host);
      } else {
        await this.linuxHandler.uninstall(host);
      }

      await this.updateAgentStatus(host.id, false);

      const metadata: LogMetadata = {
        hostId: host.id,
        osType: host.os_type,
        status: 'success'
      };
      logger.info('Agent uninstalled successfully', metadata);
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        hostId: host.id,
        osType: host.os_type,
        status: 'failed'
      };
      logger.error('Failed to uninstall agent', metadata);
      throw new ApiError('Failed to uninstall agent', 500);
    }
  }

  private async updateAgentStatus(hostId: string, installed: boolean): Promise<void> {
    try {
      await db.query(
        'UPDATE hosts SET agent_installed = $1 WHERE id = $2',
        [installed, hostId]
      );
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        hostId,
        status: 'failed'
      };
      logger.error('Failed to update agent status', metadata);
      throw new ApiError('Failed to update agent status in database', 500);
    }
  }

  public async getHostById(hostId: string): Promise<ExtendedHost> {
    try {
      const result = await db.query<ExtendedHost>(
        'SELECT * FROM hosts WHERE id = $1',
        [hostId]
      );
      
      if (result.rows.length === 0) {
        throw new ApiError('Host not found', 404);
      }

      return result.rows[0];
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        hostId,
        status: 'failed'
      };
      logger.error('Failed to get host', metadata);
      throw new ApiError('Failed to get host from database', 500);
    }
  }
}

export const agentInstallerService = new AgentInstallerService();
