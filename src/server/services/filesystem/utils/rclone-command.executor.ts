import { spawn } from 'child_process';
import { Logger } from '../../../../types/logger';
import { RcloneCommandResult } from '../types/rclone.types';

/**
 * Handles execution of Rclone commands with proper error handling and logging
 */
export class RcloneCommandExecutor {
  constructor(
    private readonly logger: Logger,
    private readonly configPath: string
  ) {}

  /**
   * Executes an Rclone command with the given arguments.
   * 
   * @param args - Array of command line arguments to pass to Rclone
   * @returns Object containing stdout and stderr from the command
   * @throws {Error} If command fails or returns non-zero exit code
   */
  async execute(args: string[]): Promise<RcloneCommandResult> {
    if (!this.configPath) {
      throw new Error('Rclone not initialized - missing config path');
    }

    return new Promise((resolve, reject) => {
      const process = spawn('rclone', ['--config', this.configPath, ...args]);
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      process.on('close', (code: number | null) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          const errorCode = code === null ? 'unknown' : code.toString();
          reject(new Error(`Rclone command failed with code ${errorCode}: ${stderr}`));
        }
      });

      process.on('error', (err) => {
        this.logger.error('Failed to execute Rclone command', {
          error: err.message,
          args
        });
        reject(err);
      });
    });
  }
}
