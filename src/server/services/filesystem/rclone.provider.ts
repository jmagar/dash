import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { FileSystemType, FileItem, FileSystemStats } from '../../../types/filesystem';
import { LoggingManager } from '../../managers/LoggingManager';
import { LoggerAdapter } from '../../utils/logging/logger.adapter';
import type { Logger } from '../../../types/logger';
import { RcloneItem, RcloneCredentials } from './types/rclone.types';
import { RcloneCommandExecutor } from './utils/rclone-command.executor';
import { RcloneCleanupManager } from './utils/rclone-cleanup.manager';

/**
 * Implements a filesystem provider that uses Rclone to interact with various remote storage systems.
 * This provider allows for unified access to different storage backends supported by Rclone.
 * 
 * Features:
 * - Supports all storage providers that Rclone supports (S3, Google Drive, etc.)
 * - Provides standard filesystem operations (read, write, delete, etc.)
 * - Handles temporary file management for operations
 * - Includes comprehensive logging and error handling
 */
export class RcloneProvider {
  readonly type: FileSystemType = 'rclone';
  private remoteName = '';
  private configPath = '';
  private readonly logger: Logger;
  private credentials?: RcloneCredentials;
  private commandExecutor?: RcloneCommandExecutor;
  private readonly cleanupManager: RcloneCleanupManager;

  constructor(logManager?: LoggingManager) {
    const baseLogger = logManager ?? LoggingManager.getInstance();
    this.logger = new LoggerAdapter(baseLogger, {
      component: 'RcloneProvider',
      service: 'FileSystem'
    });
    this.cleanupManager = new RcloneCleanupManager(this.logger);
  }

  /**
   * Initializes the connection to the Rclone remote.
   * Must call setCredentials() with valid credentials before connecting.
   * 
   * @throws {Error} If credentials are not set or connection fails
   */
  async connect(): Promise<void> {
    if (!this.credentials) {
      throw new Error('Rclone credentials not set');
    }

    try {
      const tempDir = await fs.mkdtemp(join(tmpdir(), 'rclone-'));
      this.configPath = join(tempDir, 'rclone.conf');

      this.logger.info('Creating temporary Rclone config', {
        configPath: this.configPath,
        remote: this.credentials.remote
      });

      await fs.writeFile(this.configPath, this.credentials.configContent);
      this.remoteName = this.credentials.remote;
      this.commandExecutor = new RcloneCommandExecutor(this.logger, this.configPath);

      this.logger.info('Connected to Rclone remote', {
        remote: this.remoteName
      });
    } catch (error) {
      this.logger.error('Failed to connect to Rclone remote', {
        error: error instanceof Error ? error.message : String(error),
        remote: this.credentials.remote
      });
      throw error;
    }
  }

  /**
   * Sets the credentials required for connecting to the Rclone remote.
   * Must be called before connect().
   * 
   * @param credentials - The Rclone credentials containing remote name and config
   * @throws {Error} If required credential fields are missing
   */
  setCredentials(credentials: RcloneCredentials): void {
    if (!credentials.remote || !credentials.configContent) {
      throw new Error('Missing required Rclone credentials (remote and configContent)');
    }
    this.credentials = credentials;
  }

  /**
   * Lists files and directories in the specified path.
   * 
   * @param path - The path to list contents of
   * @returns Array of file/directory names
   * @throws {Error} If listing fails or path is invalid
   */
  async list(path: string): Promise<string[]> {
    try {
      const files = await this.listFiles(path);
      return files.map(file => file.name);
    } catch (error) {
      this.logger.error('Failed to list directory contents', {
        error: error instanceof Error ? error.message : String(error),
        path
      });
      throw error;
    }
  }

  /**
   * Gets detailed information about files and directories in the specified path.
   * This is an extended version of list() that includes full file metadata.
   * 
   * @param path - The path to list contents of
   * @returns Array of FileItem objects containing detailed metadata
   * @throws {Error} If listing fails or path is invalid
   */
  async listFiles(path: string): Promise<FileItem[]> {
    try {
      const { stdout } = await this.executeCommand(['lsjson', `${this.remoteName}:${path}`]);
      const items = JSON.parse(stdout) as RcloneItem[];
      return items.map(item => ({
        name: item.Name,
        path: `${path}/${item.Name}`.replace(/\/+/g, '/'),
        isDirectory: item.IsDir,
        size: item.Size,
        modifiedTime: new Date(item.ModTime).toISOString(),
        mimeType: item.MimeType
      }));
    } catch (error) {
      this.logger.error('Failed to list files', {
        error: error instanceof Error ? error.message : String(error),
        path
      });
      throw error;
    }
  }

  /**
   * Gets file or directory statistics.
   * 
   * @param path - Path to get stats for
   * @returns FileSystemStats object containing item metadata
   * @throws {Error} If path doesn't exist or operation fails
   */
  async stat(path: string): Promise<FileSystemStats> {
    if (!this.configPath) throw new Error('Not connected');

    try {
      const { stdout } = await this.executeCommand(['lsjson', `${this.remoteName}:${path}`]);
      const parsed = JSON.parse(stdout) as RcloneItem[];
      const item = this.ensureValidStats(parsed, path);
      const modTime = new Date(item.ModTime).getTime();

      return {
        size: item.Size,
        mtime: modTime,
        mode: 0o644,
        modTime,
        owner: 'rclone',
        group: 'rclone',
        isDirectory: item.IsDir,
        isFile: !item.IsDir,
        permissions: item.IsDir ? 'drwxr-xr-x' : '-rw-r--r--'
      };
    } catch (error) {
      this.logger.error('Failed to get file stats', {
        error: error instanceof Error ? error.message : String(error),
        path
      });
      throw error;
    }
  }

  /**
   * Executes an Rclone command using the command executor.
   * 
   * @private
   * @param args - Command arguments to pass to Rclone
   * @returns Command execution result
   * @throws {Error} If command executor is not initialized
   */
  private async executeCommand(args: string[]): Promise<{ stdout: string; stderr: string }> {
    if (!this.commandExecutor) {
      throw new Error('Command executor not initialized');
    }
    return this.commandExecutor.execute(args);
  }

  /**
   * Ensures that stats data is valid and contains required fields.
   * 
   * @private
   * @param parsed - Array of parsed stats data from Rclone
   * @param path - Path that was queried (for error messages)
   * @returns The first stats item from the array
   * @throws {Error} If no valid stats are available
   */
  private ensureValidStats(parsed: RcloneItem[], path: string): RcloneItem {
    const firstItem = parsed[0];
    if (!firstItem) {
      throw new Error(`No stats available for path: ${path}`);
    }
    return firstItem;
  }

  /**
   * Cleans up temporary files created by Rclone.
   * 
   * @private
   * @throws {Error} If cleanup fails
   */
  private async cleanup(): Promise<void> {
    try {
      await fs.unlink(this.configPath).catch(() => {
        // Ignore error if file doesn't exist
      });
      const dirPath = join(this.configPath, '..');
      await fs.rmdir(dirPath).catch(() => {
        // Ignore error if directory doesn't exist
      });
      this.logger.info('Cleaned up Rclone temporary files', {
        configPath: this.configPath
      });
    } catch (error) {
      this.logger.error('Failed to cleanup Rclone files', {
        error: error instanceof Error ? error.message : String(error),
        configPath: this.configPath
      });
    }
  }
}
