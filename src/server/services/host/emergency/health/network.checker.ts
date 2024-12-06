import { Client as SSHClient } from 'ssh2';
import type { Logger, LogMetadata } from '../../../../../types/logger';
import { CommandExecutor } from '../ssh/command.executor';

export class NetworkChecker {
  private readonly commandExecutor: CommandExecutor;

  constructor(private readonly logger: Logger) {
    this.commandExecutor = new CommandExecutor(logger);
  }

  /**
   * Check network connectivity
   * Tests both DNS resolution and HTTP connectivity
   */
  async check(ssh: SSHClient): Promise<void> {
    const startTime = Date.now();
    const methodLogger = this.logger.withContext({ 
      operation: 'checkNetwork',
      component: 'NetworkChecker'
    });

    try {
      methodLogger.debug('Starting network check');

      // Check DNS resolution
      methodLogger.debug('Testing DNS resolution');
      await this.commandExecutor.execute(ssh, 'ping -c 1 google.com');

      // Check HTTP connectivity
      methodLogger.debug('Testing HTTP connectivity');
      await this.commandExecutor.execute(
        ssh, 
        'curl -s -S --max-time 5 https://google.com > /dev/null'
      );
      
      const duration = Date.now() - startTime;
      methodLogger.info('Network connectivity check passed', {
        timing: { total: duration }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const metadata: LogMetadata = {
        error: error instanceof Error ? error : new Error(String(error)),
        timing: { total: duration }
      };
      methodLogger.error('Network connectivity check failed', metadata);
      throw error;
    }
  }

  /**
   * Check if host is reachable via SSH
   */
  async checkConnectivity(ssh: SSHClient): Promise<boolean> {
    const methodLogger = this.logger.withContext({
      operation: 'checkConnectivity',
      component: 'NetworkChecker'
    });

    try {
      await this.commandExecutor.execute(ssh, 'echo 1');
      methodLogger.debug('SSH connection test successful');
      return true;
    } catch (error) {
      methodLogger.debug('SSH connection test failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
}
