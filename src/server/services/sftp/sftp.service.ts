import { SFTPWrapper, Client as SSHClient } from 'ssh2';
import { BaseService } from '../base.service';
import { Host } from '../../../types/host.types';
import { FileItem } from '../../../types/models-shared';
import { logger } from '../../utils/logger';
import { ApiError } from '../../../types/error';
import type { LogMetadata } from '../../../types/logger';

interface SSHClientWithSFTP extends SSHClient {
  sftp(callback: (err: Error | null, sftp: SFTPWrapper) => void): void;
}

interface FileAttributes {
  mode: number;
  uid: number;
  gid: number;
  size: number;
  atime: number;
  mtime: number;
}

interface SFTPFileEntry {
  filename: string;
  longname: string;
  attrs: FileAttributes;
}

type SFTPStats = FileAttributes;

export class SFTPService extends BaseService {
  private sshClient: SSHClientWithSFTP | null = null;

  constructor(private readonly host: Host) {
    super();
  }

  private async withSFTP<T>(operation: (sftp: SFTPWrapper) => Promise<T>): Promise<T> {
    if (!this.sshClient) {
      throw new ApiError('SSH client not initialized');
    }

    return new Promise<T>((resolve, reject) => {
      this.sshClient?.sftp((err: Error | null, sftp: SFTPWrapper) => {
        if (err) {
          const metadata: LogMetadata = {
            error: err,
            host: this.host,
            operation: 'SFTP initialization'
          };
          logger.error('Failed to initialize SFTP client', metadata);
          reject(new ApiError('Failed to initialize SFTP client', { cause: err }));
          return;
        }

        operation(sftp)
          .then(resolve)
          .catch((error: unknown) => {
            let err: Error;
            if (error instanceof Error) {
              err = error;
            } else if (typeof error === 'string') {
              err = new Error(error);
            } else {
              err = new Error('Unknown error');
            }
            const metadata: LogMetadata = {
              error: err,
              host: this.host,
              operation: 'SFTP operation'
            };
            logger.error('SFTP operation failed', metadata);
            reject(new ApiError('SFTP operation failed', { cause: err }));
          })
          .finally(() => {
            try {
              if (this.sshClient) {
                this.sshClient.end();
                this.sshClient = null;
              }
            } catch (err: unknown) {
              let error: Error;
              if (err instanceof Error) {
                error = err;
              } else if (typeof err === 'string') {
                error = new Error(err);
              } else {
                error = new Error('Unknown error during SSH client cleanup');
              }
              logger.warn('Failed to close SSH client', { error });
            }
          });
      });
    });
  }

  async listFiles(path: string): Promise<FileItem[]> {
    return this.withSFTP(async (sftp) => {
      return new Promise<FileItem[]>((resolve, reject) => {
        sftp.readdir(path, (err: Error | null, list: SFTPFileEntry[]) => {
          if (err) {
            reject(err);
            return;
          }

          const files = list.map((entry: SFTPFileEntry) => {
            const isDirectory = Boolean(entry.attrs.mode & 0o40000);
            return {
              name: entry.filename,
              path: path + (path.endsWith('/') ? '' : '/') + entry.filename,
              type: isDirectory ? 'directory' as const : 'file' as const,
              isDirectory,
              size: entry.attrs.size,
              modifiedTime: new Date(entry.attrs.mtime * 1000),
              permissions: (entry.attrs.mode & 0o777).toString(8)
            };
          });

          resolve(files);
        });
      });
    });
  }

  async readFile(path: string): Promise<Buffer> {
    return this.withSFTP(async (sftp) => {
      return new Promise<Buffer>((resolve, reject) => {
        sftp.readFile(path, (err: Error | null, data: Buffer) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(data);
        });
      });
    });
  }

  async writeFile(path: string, data: Buffer): Promise<void> {
    return this.withSFTP(async (sftp) => {
      return new Promise<void>((resolve, reject) => {
        sftp.writeFile(path, data, (err: Error | null) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    });
  }

  async delete(path: string): Promise<void> {
    return this.withSFTP(async (sftp) => {
      return new Promise<void>((resolve, reject) => {
        sftp.stat(path, (err: Error | null, stats: SFTPStats) => {
          if (err) {
            const metadata: LogMetadata = {
              error: err,
              host: this.host,
              operation: 'SFTP stat'
            };
            logger.error('Failed to get file stats', metadata);
            reject(new ApiError('Failed to get file stats', { cause: err }));
            return;
          }

          const isDir = Boolean(stats.mode & 0o40000);
          const deleteOperation = isDir ? 
            (path: string, cb: (err: Error | null) => void) => sftp.rmdir(path, cb) :
            (path: string, cb: (err: Error | null) => void) => sftp.unlink(path, cb);

          deleteOperation(path, (err: Error | null) => {
            if (err) {
              const metadata: LogMetadata = {
                error: err,
                host: this.host,
                operation: isDir ? 'SFTP rmdir' : 'SFTP unlink'
              };
              logger.error('Failed to delete file', metadata);
              reject(new ApiError('Failed to delete file', { cause: err }));
              return;
            }
            resolve();
          });
        });
      });
    });
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    return this.withSFTP(async (sftp) => {
      return new Promise<void>((resolve, reject) => {
        sftp.rename(oldPath, newPath, (err: Error | null) => {
          if (err) {
            const metadata: LogMetadata = {
              error: err,
              host: this.host,
              operation: 'SFTP rename'
            };
            logger.error('Failed to rename file', metadata);
            reject(new ApiError('Failed to rename file', { cause: err }));
            return;
          }
          resolve();
        });
      });
    });
  }

  async mkdir(path: string): Promise<void> {
    return this.withSFTP(async (sftp) => {
      return new Promise<void>((resolve, reject) => {
        sftp.mkdir(path, (err: Error | null) => {
          if (err) {
            const metadata: LogMetadata = {
              error: err,
              host: this.host,
              operation: 'SFTP mkdir'
            };
            logger.error('Failed to create directory', metadata);
            reject(new ApiError('Failed to create directory', { cause: err }));
            return;
          }
          resolve();
        });
      });
    });
  }

  async stat(path: string): Promise<SFTPStats> {
    return this.withSFTP(async (sftp) => {
      return new Promise<SFTPStats>((resolve, reject) => {
        sftp.stat(path, (err, stats) => {
          if (err) {
            reject(err);
            return;
          }

          resolve(stats as SFTPStats);
        });
      });
    });
  }
}
