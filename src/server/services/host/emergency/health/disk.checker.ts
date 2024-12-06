import { Client as SSHClient } from 'ssh2';
import type { Logger, LogMetadata } from '../../../../../types/logger';
import { CommandExecutor } from '../ssh/command.executor';
import { DiskParser } from '../parsers/disk.parser';

export class DiskChecker {
  private readonly commandExecutor: CommandExecutor;

  constructor(private readonly logger: Logger) {
    this.commandExecutor = new CommandExecutor(logger);
  }

  /**
   * Check available disk space
   * Throws error if disk usage is above 90%
   */
  async check(ssh: SSHClient): Promise<void> {
    const startTime = Date.now();
    const methodLogger = this.logger.withContext({ 
      operation: 'checkDiskSpace',
      component: 'DiskChecker'
    });

    try {
      methodLogger.debug('Starting disk space check');

      const output = await this.commandExecutor.execute(ssh, 'df -h /');
      const usage = DiskParser.parse(output);

      const duration = Date.now() - startTime;
      methodLogger.info('Disk space check completed', {
        usagePercent: usage.percent,
        timing: { total: duration }
      });

      if (usage.percent > 90) {
        methodLogger.critical('Disk usage critical', { 
          usagePercent: usage.percent,
          notify: true,
          timing: { total: duration }
        });
        throw new Error(`Disk usage critical: ${usage.percent}%`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const metadata: LogMetadata = {
        error: error instanceof Error ? error : new Error(String(error)),
        timing: { total: duration }
      };
      methodLogger.error('Disk space check failed', metadata);
      throw error;
    }
  }
}
