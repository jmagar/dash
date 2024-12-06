import { Client as SSHClient } from 'ssh2';
import type { Logger, LogMetadata } from '../../../../../types/logger';
import { CommandExecutor } from '../ssh/command.executor';
import { HostState, OperationResult } from '../types';

export class ProcessOperations {
  private readonly commandExecutor: CommandExecutor;

  constructor(private readonly logger: Logger) {
    this.commandExecutor = new CommandExecutor(logger);
  }

  /**
   * Kill a specific process by PID
   */
  async killProcess(ssh: SSHClient, pid: number): Promise<OperationResult> {
    const startTime = Date.now();
    const methodLogger = this.logger.withContext({
      operation: 'killProcess',
      pid,
      component: 'ProcessOperations'
    });

    try {
      methodLogger.info('Starting process kill');
      await this.commandExecutor.execute(ssh, `kill -9 ${pid}`);

      const duration = Date.now() - startTime;
      methodLogger.info('Process killed successfully', {
        timing: { total: duration }
      });

      return {
        success: true,
        state: HostState.ACTIVE
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const metadata: LogMetadata = {
        error: error instanceof Error ? error : new Error(String(error)),
        timing: { total: duration }
      };
      methodLogger.error('Failed to kill process', metadata);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
        state: HostState.ERROR
      };
    }
  }

  /**
   * Restart the agent service
   */
  async restartAgent(ssh: SSHClient): Promise<OperationResult> {
    const startTime = Date.now();
    const methodLogger = this.logger.withContext({ 
      operation: 'restartAgent',
      component: 'ProcessOperations'
    });

    try {
      methodLogger.info('Starting agent restart');

      // Try systemctl first
      try {
        methodLogger.info('Attempting systemctl restart');
        await this.commandExecutor.execute(ssh, 'sudo systemctl restart shh-agent');
      } catch (error) {
        const metadata: LogMetadata = {
          error: error instanceof Error ? error : new Error(String(error)),
          method: 'systemctl'
        };
        methodLogger.error('Failed to restart agent via systemctl', metadata);

        // Fallback to process kill
        methodLogger.info('Attempting process kill restart');
        await this.commandExecutor.execute(ssh, 'pkill -f shh-agent');
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.commandExecutor.execute(ssh, '/opt/shh/agent/agent &');
      }

      const duration = Date.now() - startTime;
      methodLogger.info('Agent restart completed', {
        timing: { total: duration }
      });

      return {
        success: true,
        state: HostState.MAINTENANCE
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const metadata: LogMetadata = {
        error: error instanceof Error ? error : new Error(String(error)),
        timing: { total: duration }
      };
      methodLogger.error('Agent restart failed', metadata);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
        state: HostState.ERROR
      };
    }
  }
}
