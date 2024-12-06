import { Client as SSHClient } from 'ssh2';
import type { Logger, LogMetadata } from '../../../../../types/logger';

export class CommandExecutor {
  constructor(private readonly logger: Logger) {}

  /**
   * Execute command with timeout and error handling
   */
  async execute(ssh: SSHClient, command: string): Promise<string> {
    const startTime = Date.now();
    const methodLogger = this.logger.withContext({ 
      operation: 'execCommand',
      command: command.replace(/\n\s+/g, ' ').trim()
    });

    return new Promise((resolve, reject) => {
      ssh.exec(command, (err, stream) => {
        if (err) {
          const metadata: LogMetadata = {
            error: err,
            timing: { total: Date.now() - startTime }
          };
          methodLogger.error('SSH command execution failed', metadata);
          reject(err);
          return;
        }

        let output = '';
        let error = '';

        stream.on('data', (data: Buffer) => {
          output += data.toString();
        });

        stream.stderr.on('data', (data: Buffer) => {
          error += data.toString();
        });

        stream.on('close', (code: number) => {
          const duration = Date.now() - startTime;
          if (code !== 0) {
            const errorMsg = `Command failed with code ${code}: ${error}`;
            methodLogger.error('Command execution failed', {
              code,
              error,
              timing: { total: duration }
            });
            reject(new Error(errorMsg));
          } else {
            methodLogger.debug('Command executed successfully', {
              code,
              timing: { total: duration }
            });
            resolve(output.trim());
          }
        });
      });
    });
  }
}
