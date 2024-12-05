import { promises as fs } from 'fs';
import { join } from 'path';
import { Logger } from '../../../../types/logger';

/**
 * Manages cleanup of temporary files and resources used by RcloneProvider
 */
export class RcloneCleanupManager {
  constructor(private readonly logger: Logger) {}

  /**
   * Cleans up temporary files and directories
   * 
   * @param configPath - Path to the temporary config file
   */
  async cleanup(configPath: string): Promise<void> {
    try {
      if (configPath) {
        await fs.unlink(configPath);
        await fs.rmdir(join(configPath, '..'));
        this.logger.info('Cleaned up Rclone temporary files', {
          configPath
        });
      }
    } catch (error) {
      this.logger.error('Failed to cleanup Rclone files', {
        error: error instanceof Error ? error.message : String(error),
        configPath
      });
    }
  }
}
