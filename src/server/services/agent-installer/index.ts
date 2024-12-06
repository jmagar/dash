import type { ExtendedHost, InstallOptions } from '../../../types/agent';
import { IAgentHandler } from './types';
import type { Logger, LogMetadata, LogContext } from '../../../types/logger';
import { ApiError } from '../../../types/error';
import { LoggingManager } from '../../managers/LoggingManager';
import { LoggerAdapter } from '../../utils/logging/logger.adapter';
import type { Host } from '../../../types/host';
import { ServiceStatus } from '../../../types/status';

export class AgentInstaller {
  private readonly logger: Logger;
  private linuxHandler: IAgentHandler;
  private windowsHandler: IAgentHandler;

  constructor(
    linuxHandler: IAgentHandler, 
    windowsHandler: IAgentHandler,
    logManager?: LoggingManager
  ) {
    this.linuxHandler = linuxHandler;
    this.windowsHandler = windowsHandler;

    // Initialize logger following the logging pattern
    const baseLogger = logManager ?? LoggingManager.getInstance();
    this.logger = new LoggerAdapter(baseLogger, { 
      component: 'AgentInstaller',
      service: 'AgentService'
    });
  }

  async installAgent(host: ExtendedHost, options: InstallOptions): Promise<void> {
    const startTime = Date.now();
    // Create method-specific logger with context
    const context: LogContext = { 
      operation: 'installAgent',
      hostId: host.id,
      hostname: host.hostname,
      component: 'AgentInstaller'
    };
    const methodLogger = this.logger.withContext(context);

    try {
      methodLogger.info('Starting agent installation', {
        hostname: host.hostname,
        osType: host.os_type,
        options
      });

      const handler = this.getHandlerForHost(host);
      // Convert ExtendedHost to Host with proper status mapping
      const baseHost: Host = {
        ...host,
        status: ServiceStatus.STARTING, // Always set to STARTING during install
        agentStatus: ServiceStatus.STARTING
      };

      await handler.installAgent(baseHost, options);

      const duration = Date.now() - startTime;
      methodLogger.info('Agent installation completed', {
        hostname: host.hostname,
        osType: host.os_type,
        timing: {
          total: duration
        }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const metadata: LogMetadata = {
        error: error instanceof Error ? error : new Error(String(error)),
        hostname: host.hostname,
        hostId: host.id,
        osType: host.os_type,
        timing: {
          total: duration
        }
      };
      methodLogger.error('Failed to install agent', metadata);
      throw error;
    }
  }

  async uninstallAgent(host: ExtendedHost): Promise<void> {
    const startTime = Date.now();
    // Create method-specific logger with context
    const context: LogContext = { 
      operation: 'uninstallAgent',
      hostId: host.id,
      hostname: host.hostname,
      component: 'AgentInstaller'
    };
    const methodLogger = this.logger.withContext(context);

    try {
      methodLogger.info('Starting agent uninstallation', {
        hostname: host.hostname,
        osType: host.os_type
      });

      const handler = this.getHandlerForHost(host);
      // Convert ExtendedHost to Host with proper status mapping
      const baseHost: Host = {
        ...host,
        status: ServiceStatus.STOPPING, // Set to STOPPING during uninstall
        agentStatus: ServiceStatus.STOPPING
      };

      await handler.uninstallAgent(baseHost);

      const duration = Date.now() - startTime;
      methodLogger.info('Agent uninstallation completed', {
        hostname: host.hostname,
        osType: host.os_type,
        timing: {
          total: duration
        }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const metadata: LogMetadata = {
        error: error instanceof Error ? error : new Error(String(error)),
        hostname: host.hostname,
        hostId: host.id,
        osType: host.os_type,
        timing: {
          total: duration
        }
      };
      methodLogger.error('Failed to uninstall agent', metadata);
      throw error;
    }
  }

  private getHandlerForHost(host: ExtendedHost): IAgentHandler {
    const osType = host.os_type?.toLowerCase();
    switch (osType) {
      case 'linux':
        return this.linuxHandler;
      case 'windows':
        return this.windowsHandler;
      default:
        throw new ApiError(`Unsupported OS type: ${osType}`);
    }
  }
}

export type { InstallOptions } from '../../../types/agent';
