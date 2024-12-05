import { SFTPWrapper, Client as SSHClient } from 'ssh2';
import { BaseService } from '../base.service';
import { Host } from '../../../types/host.types';
import { FileItem } from '../../../types/models-shared';
import { ApiError } from '../../../types/error';
import { LoggingManager } from '../../managers/LoggingManager';
import { LoggerAdapter } from '../../utils/logging/logger.adapter';
import type { Logger } from '../../../types/logger';

/** SSH client with SFTP capability */
interface SSHClientWithSFTP extends SSHClient {
  sftp(callback: (err: Error | null, sftp: SFTPWrapper) => void): void;
}

/** File attributes from SFTP */
interface FileAttributes {
  mode: number;
  uid: number;
  gid: number;
  size: number;
  atime: number;
  mtime: number;
}

/** SFTP file entry with metadata */
interface SFTPFileEntry {
  filename: string;
  longname: string;
  attrs: FileAttributes;
}

/** File statistics from SFTP */
type SFTPStats = FileAttributes;

/**
 * Service for interacting with remote servers via SFTP.
 * Provides file operations like list, read, write, delete, etc.
 */
export class SFTPService extends BaseService {
  private sshClient: SSHClientWithSFTP | null = null;
  protected readonly logger: Logger;

  constructor(private readonly host: Host) {
    super();
    this.logger = new LoggerAdapter(LoggingManager.getInstance(), {
      component: 'SFTPService',
      service: 'FileSystem',
      host: this.host.hostname
    });
  }

  /**
   * Executes an SFTP operation with proper connection handling and cleanup.
   * @param operation - The SFTP operation to execute
   * @returns Promise resolving to the operation result
   * @throws ApiError if operation fails
   */
  private async withSFTP<T>(operation: (sftp: SFTPWrapper) => Promise<T>): Promise<T> {
    if (!this.sshClient) {
      throw new ApiError('SSH client not initialized');
    }

    return new Promise<T>((resolve, reject) => {
      this.sshClient?.sftp((err: Error | null, sftp: SFTPWrapper) => {
        if (err) {
          this.logger.error('Failed to initialize SFTP client', {
            error: err.message,
            host: this.host.hostname
          });
          reject(new ApiError('Failed to initialize SFTP client', { cause: err }));
          return;
        }

        operation(sftp)
          .then(resolve)
          .catch((error: unknown) => {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error('SFTP operation failed', {
              error: err.message,
              host: this.host.hostname,
              operation: operation.name
            });
            this.handleError(err, {
              operation: operation.name,
              host: this.host.hostname
            });
          })
          .finally(() => {
            void this.cleanup();
          });
      });
    });
  }

  /**
   * Lists files and directories in the specified path.
   * @param path - Directory path to list
   * @returns Promise resolving to array of FileItems
   * @throws ApiError if listing fails
   */
  async listFiles(path: string): Promise<FileItem[]> {
    return this.withSFTP(async (sftp) => {
      return new Promise<FileItem[]>((resolve, reject) => {
        sftp.readdir(path, (err: Error | null, list: SFTPFileEntry[]) => {
          if (err) {
            this.logger.error('Failed to list directory', {
              error: err.message,
              path,
              host: this.host.hostname
            });
            reject(new ApiError('Failed to list directory', { cause: err }));
            return;
          }

          const files = list.map((entry: SFTPFileEntry) => this.mapToFileItem(entry, path));
          resolve(files);
        });
      });
    });
  }

  /**
   * Reads a file from the remote server.
   * @param path - Path to the file to read
   * @returns Promise resolving to file contents as Buffer
   * @throws ApiError if read fails
   */
  async readFile(path: string): Promise<Buffer> {
    return this.withSFTP(async (sftp) => {
      return new Promise<Buffer>((resolve, reject) => {
        sftp.readFile(path, (err: Error | null, data: Buffer) => {
          if (err) {
            this.logger.error('Failed to read file', {
              error: err.message,
              path,
              host: this.host.hostname
            });
            reject(new ApiError('Failed to read file', { cause: err }));
            return;
          }
          resolve(data);
        });
      });
    });
  }

  /**
   * Writes data to a file on the remote server.
   * @param path - Path where to write the file
   * @param data - Data to write
   * @throws ApiError if write fails
   */
  async writeFile(path: string, data: Buffer): Promise<void> {
    return this.withSFTP(async (sftp) => {
      return new Promise<void>((resolve, reject) => {
        sftp.writeFile(path, data, (err: Error | null) => {
          if (err) {
            this.logger.error('Failed to write file', {
              error: err.message,
              path,
              host: this.host.hostname,
              size: data.length
            });
            reject(new ApiError('Failed to write file', { cause: err }));
            return;
          }
          this.logger.info('Successfully wrote file', {
            path,
            host: this.host.hostname,
            size: data.length
          });
          resolve();
        });
      });
    });
  }

  /**
   * Deletes a file or directory on the remote server.
   * @param path - Path to the file or directory to delete
   * @throws ApiError if deletion fails
   */
  async delete(path: string): Promise<void> {
    return this.withSFTP(async (sftp) => {
      return new Promise<void>((resolve, reject) => {
        sftp.stat(path, (err: Error | null, stats: SFTPStats) => {
          if (err) {
            this.logger.error('Failed to get file stats', {
              error: err.message,
              path,
              host: this.host.hostname
            });
            reject(new ApiError('Failed to get file stats', { cause: err }));
            return;
          }

          const isDir = Boolean(stats.mode & 0o40000);
          const deleteOperation = isDir ? 
            (path: string, cb: (err: Error | null) => void) => sftp.rmdir(path, cb) :
            (path: string, cb: (err: Error | null) => void) => sftp.unlink(path, cb);

          deleteOperation(path, (err: Error | null) => {
            if (err) {
              this.logger.error('Failed to delete file', {
                error: err.message,
                path,
                host: this.host.hostname
              });
              reject(new ApiError('Failed to delete file', { cause: err }));
              return;
            }
            this.logger.info('Successfully deleted file', {
              path,
              host: this.host.hostname
            });
            resolve();
          });
        });
      });
    });
  }

  /**
   * Renames a file or directory on the remote server.
   * @param oldPath - Current path of the file or directory
   * @param newPath - New path for the file or directory
   * @throws ApiError if rename fails
   */
  async rename(oldPath: string, newPath: string): Promise<void> {
    return this.withSFTP(async (sftp) => {
      return new Promise<void>((resolve, reject) => {
        sftp.rename(oldPath, newPath, (err: Error | null) => {
          if (err) {
            this.logger.error('Failed to rename file', {
              error: err.message,
              oldPath,
              newPath,
              host: this.host.hostname
            });
            reject(new ApiError('Failed to rename file', { cause: err }));
            return;
          }
          this.logger.info('Successfully renamed file', {
            oldPath,
            newPath,
            host: this.host.hostname
          });
          resolve();
        });
      });
    });
  }

  /**
   * Creates a new directory on the remote server.
   * @param path - Path where to create the directory
   * @throws ApiError if creation fails
   */
  async mkdir(path: string): Promise<void> {
    return this.withSFTP(async (sftp) => {
      return new Promise<void>((resolve, reject) => {
        sftp.mkdir(path, (err: Error | null) => {
          if (err) {
            this.logger.error('Failed to create directory', {
              error: err.message,
              path,
              host: this.host.hostname
            });
            reject(new ApiError('Failed to create directory', { cause: err }));
            return;
          }
          this.logger.info('Successfully created directory', {
            path,
            host: this.host.hostname
          });
          resolve();
        });
      });
    });
  }

  /**
   * Retrieves file statistics for the specified path.
   * @param path - Path to retrieve statistics for
   * @returns Promise resolving to file statistics
   * @throws ApiError if retrieval fails
   */
  async stat(path: string): Promise<SFTPStats> {
    return this.withSFTP(async (sftp) => {
      return new Promise<SFTPStats>((resolve, reject) => {
        sftp.stat(path, (err: Error | null, stats: SFTPStats) => {
          if (err) {
            this.logger.error('Failed to get file stats', {
              error: err.message,
              path,
              host: this.host.hostname
            });
            reject(new ApiError('Failed to get file stats', { cause: err }));
            return;
          }
          resolve(stats);
        });
      });
    });
  }

  /**
   * Maps an SFTP file entry to our FileItem interface.
   * @private
   */
  private mapToFileItem(entry: SFTPFileEntry, basePath: string): FileItem {
    const isDirectory = Boolean(entry.attrs.mode & 0o40000);
    return {
      name: entry.filename,
      path: basePath + (basePath.endsWith('/') ? '' : '/') + entry.filename,
      type: isDirectory ? 'directory' as const : 'file' as const,
      size: entry.attrs.size,
      modifiedTime: new Date(entry.attrs.mtime * 1000),
      permissions: (entry.attrs.mode & 0o777).toString(8)
    };
  }

  /**
   * Cleans up SSH client connection.
   */
  public async cleanup(): Promise<void> {
    if (this.sshClient) {
      try {
        // Wrap the end() call in a promise to make it awaitable
        await new Promise<void>((resolve) => {
          this.sshClient?.end();
          resolve();
        });
        this.sshClient = null;
      } catch (error: unknown) {
        this.handleError(error, {
          operation: 'cleanup',
          host: this.host.hostname
        });
      }
    }
  }
}
