import { Client as SSHClient } from 'ssh2';
import type { Logger, LogMetadata } from '../../../../../types/logger';
import { CommandExecutor } from '../ssh/command.executor';
import { MemoryParser } from '../parsers/memory.parser';

export class MemoryChecker {
  private readonly commandExecutor: CommandExecutor;

  constructor(private readonly logger: Logger) {
    this.commandExecutor = new CommandExecutor(logger);
  }

  /**
   * Check available memory
   * Throws error if memory usage is above 90%
   */
  async check(ssh: SSHClient): Promise<void> {
    const startTime = Date.now();
    const methodLogger = this.logger.withContext({ 
      operation: 'checkMemory',
      component: 'MemoryChecker'
    });

    try {
      methodLogger.debug('Starting memory check');

      const output = await this.commandExecutor.execute(ssh, 'free -m');
      const usage = MemoryParser.parse(output);

      const duration = Date.now() - startTime;
      methodLogger.info('Memory check completed', { 
        total: usage.total,
        used: usage.used,
        usagePercent: usage.percent.toFixed(1),
        timing: { total: duration }
      });

      if (usage.percent > 90) {
        methodLogger.critical('Memory usage critical', {
          usagePercent: usage.percent.toFixed(1),
          notify: true,
          timing: { total: duration }
        });
        throw new Error(`Memory usage critical: ${usage.percent.toFixed(1)}%`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const metadata: LogMetadata = {
        error: error instanceof Error ? error : new Error(String(error)),
        timing: { total: duration }
      };
      methodLogger.error('Memory check failed', metadata);
      throw error;
    }
  }
}
