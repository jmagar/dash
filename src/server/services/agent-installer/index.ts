import type { ExtendedHost, InstallOptions } from '../../../types/agent';
import { IAgentHandler } from './types';
import { logger } from '../../utils/logger';
import type { LogMetadata } from '../../../types/logger';
import { ApiError } from '../../../types/error';
import { LoggingManager } from '../../managers/utils/LoggingManager';

export class AgentInstaller {
  constructor(
    private linuxHandler: IAgentHandler,
    private windowsHandler: IAgentHandler
  ) {}

  async installAgent(host: ExtendedHost, options: InstallOptions): Promise<void> {
    try {
      const handler = this.getHandlerForHost(host);
      await handler.installAgent(host, options);
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        hostname: host.hostname,
        hostId: host.id,
        osType: host.os_type
      };
      loggerLoggingManager.getInstance().();
      throw new ApiError('Failed to install agent', 500);
    }
  }

  async uninstallAgent(host: ExtendedHost): Promise<void> {
    try {
      const handler = this.getHandlerForHost(host);
      await handler.uninstallAgent(host);
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        hostname: host.hostname,
        hostId: host.id,
        osType: host.os_type
      };
      loggerLoggingManager.getInstance().();
      throw new ApiError('Failed to uninstall agent', 500);
    }
  }

  private getHandlerForHost(host: ExtendedHost): IAgentHandler {
    switch (host.os_type?.toLowerCase()) {
      case 'linux':
        return this.linuxHandler;
      case 'windows':
        return this.windowsHandler;
      default:
        throw new ApiError(`Unsupported OS type: ${host.os_type}`, 400);
    }
  }
}

export type { InstallOptions } from '../../../types/agent';


