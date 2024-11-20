import { SFTPWrapper } from 'ssh2';
import { BaseService } from '../base.service';
import { Host } from '../../../types/host';
import { FileItem } from '../../../types/models-shared';
import { logger } from '../../utils/logger';

interface SFTPStats {
  mode: number;
  uid: number;
  gid: number;
  size: number;
  atime: number;
  mtime: number;
  isDirectory: () => boolean;
  isFile: () => boolean;
  isSymbolicLink: () => boolean;
}

export class SFTPService extends BaseService {
  /**
   * Execute an operation with an SFTP connection
   */
  protected async withSFTP<T>(
    host: Host,
    operation: (sftp: SFTPWrapper) => Promise<T>
  ): Promise<T> {
    return this.withSSH(host, async (ssh) => {
      return new Promise<T>((resolve, reject) => {
        ssh.sftp((err, sftp) => {
          if (err) {
            reject(err);
            return;
          }

          operation(sftp)
            .then(resolve)
            .catch(reject)
            .finally(() => {
              sftp.end();
            });
        });
      });
    });
  }

  /**
   * List files in a directory
   */
  async listFiles(host: Host, path: string): Promise<FileItem[]> {
    return this.withSFTP(host, async (sftp) => {
      return new Promise<FileItem[]>((resolve, reject) => {
        sftp.readdir(path, (err, list) => {
          if (err) {
            reject(err);
            return;
          }

          const items: FileItem[] = list.map((item) => ({
            name: item.filename,
            path: `${path}/${item.filename}`.replace(/\/+/g, '/'),
            isDirectory: item.attrs.isDirectory(),
            size: item.attrs.size,
            modifiedTime: new Date(item.attrs.mtime * 1000).toISOString(),
            permissions: (item.attrs.mode & 0o777).toString(8),
          }));

          resolve(items);
        });
      });
    });
  }

  /**
   * Read a file's contents
   */
  async readFile(host: Host, path: string): Promise<Buffer> {
    return this.withSFTP(host, async (sftp) => {
      return new Promise<Buffer>((resolve, reject) => {
        sftp.readFile(path, (err, data) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(data);
        });
      });
    });
  }

  /**
   * Write contents to a file
   */
  async writeFile(host: Host, path: string, content: Buffer): Promise<void> {
    return this.withSFTP(host, async (sftp) => {
      return new Promise<void>((resolve, reject) => {
        sftp.writeFile(path, content, (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    });
  }

  /**
   * Delete a file or directory
   */
  async delete(host: Host, path: string): Promise<void> {
    return this.withSFTP(host, async (sftp) => {
      return new Promise<void>((resolve, reject) => {
        // First check if it's a directory
        sftp.stat(path, (err, stats) => {
          if (err) {
            reject(err);
            return;
          }

          if (stats.isDirectory()) {
            sftp.rmdir(path, (err) => {
              if (err) {
                reject(err);
                return;
              }
              resolve();
            });
          } else {
            sftp.unlink(path, (err) => {
              if (err) {
                reject(err);
                return;
              }
              resolve();
            });
          }
        });
      });
    });
  }

  /**
   * Rename/move a file or directory
   */
  async rename(host: Host, oldPath: string, newPath: string): Promise<void> {
    return this.withSFTP(host, async (sftp) => {
      return new Promise<void>((resolve, reject) => {
        sftp.rename(oldPath, newPath, (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    });
  }

  /**
   * Create a directory
   */
  async mkdir(host: Host, path: string): Promise<void> {
    return this.withSFTP(host, async (sftp) => {
      return new Promise<void>((resolve, reject) => {
        sftp.mkdir(path, (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    });
  }

  /**
   * Get file or directory stats
   */
  async stat(host: Host, path: string): Promise<SFTPStats> {
    return this.withSFTP(host, async (sftp) => {
      return new Promise<SFTPStats>((resolve, reject) => {
        sftp.stat(path, (err, stats) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(stats);
        });
      });
    });
  }
}
