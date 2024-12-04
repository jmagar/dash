import { Client, SFTPWrapper } from 'ssh2';
import type { ClientConfig, SFTPStats } from 'ssh2';
import { FileSystemProvider, FileSystemCredentials, FileSystemType, FileSystemStats } from './types';
import { FileItem } from '../../../types/models-shared';
import { logger } from '../../utils/logger';
import { LoggingManager } from '../../managers/utils/LoggingManager';

interface SFTPFileEntry {
  filename: string;
  longname: string;
  attrs: SFTPStats;
}

export class SFTPProvider implements FileSystemProvider {
  readonly type: FileSystemType = 'sftp';
  private client: Client | null = null;
  private sftp: SFTPWrapper | null = null;

  async connect(credentials: FileSystemCredentials): Promise<void> {
    if (!credentials.host || !credentials.username) {
      throw new Error('Missing required SFTP credentials: host and username are required');
    }

    try {
      this.client = new Client();

      await new Promise<void>((resolve, reject) => {
        if (!this.client) {
          reject(new Error('SFTP client not initialized'));
          return;
        }

        const config: ClientConfig = {
          host: credentials.host,
          port: credentials.port ? Number(credentials.port) : 22,
          username: credentials.username,
          password: credentials.password,
          privateKey: credentials.privateKey ? Buffer.from(credentials.privateKey) : undefined
        };

        this.client.on('ready', () => {
          this.client!.sftp((err, sftp) => {
            if (err) {
              reject(err);
              return;
            }
            this.sftp = sftp;
            resolve();
          });
        });

        this.client.on('error', (err) => {
          reject(err);
        });

        this.client.connect(config);
      });
    } catch (error) {
      loggerLoggingManager.getInstance().();
      await this.disconnect();
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await new Promise<void>((resolve) => {
          this.client?.once('close', () => resolve());
          this.client?.end();
        });
        this.client = null;
        this.sftp = null;
      }
    } catch (error) {
      loggerLoggingManager.getInstance().();
      throw error;
    }
  }

  private ensureConnected(): void {
    if (!this.sftp) {
      throw new Error('Not connected to SFTP server');
    }
  }

  async listFiles(path: string): Promise<FileItem[]> {
    this.ensureConnected();
    
    return new Promise<FileItem[]>((resolve, reject) => {
      this.sftp.readdir(path, (err: Error | null, list: SFTPFileEntry[]) => {
        if (err) {
          reject(err);
          return;
        }

        const items = list.map((entry: SFTPFileEntry): FileItem => {
          const isDirectory = (entry.attrs.mode & 0o40000) === 0o40000;
          return {
            name: entry.filename,
            path: `${path}/${entry.filename}`,
            type: isDirectory ? 'directory' : 'file',
            size: entry.attrs.size,
            modifiedTime: new Date(entry.attrs.mtime * 1000),
            metadata: {
              mode: entry.attrs.mode,
              uid: entry.attrs.uid,
              gid: entry.attrs.gid
            }
          };
        });
        resolve(items);
      });
    });
  }

  async readFile(path: string): Promise<Buffer> {
    this.ensureConnected();
    
    return new Promise<Buffer>((resolve, reject) => {
      this.sftp.readFile(path, (err: Error | null, data: Buffer) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(data);
      });
    });
  }

  async writeFile(path: string, content: Buffer): Promise<void> {
    this.ensureConnected();
    
    return new Promise<void>((resolve, reject) => {
      this.sftp.writeFile(path, content, (err: Error | null) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  async delete(path: string): Promise<void> {
    this.ensureConnected();
    
    return new Promise<void>((resolve, reject) => {
      this.sftp.unlink(path, (err: Error | null) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    this.ensureConnected();
    
    return new Promise<void>((resolve, reject) => {
      this.sftp.rename(oldPath, newPath, (err: Error | null) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  async mkdir(path: string): Promise<void> {
    this.ensureConnected();
    
    return new Promise<void>((resolve, reject) => {
      this.sftp.mkdir(path, (err: Error | null) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  async stat(path: string): Promise<FileSystemStats> {
    this.ensureConnected();

    return new Promise<FileSystemStats>((resolve, reject) => {
      this.sftp.stat(path, (err: Error | null, stats: SFTPStats) => {
        if (err) {
          reject(err);
          return;
        }

        const isDirectory = (stats.mode & 0o40000) === 0o40000;
        const isFile = (stats.mode & 0o100000) === 0o100000;

        resolve({
          size: stats.size,
          mtime: stats.mtime,
          mode: stats.mode,
          modTime: stats.mtime * 1000,
          owner: stats.uid.toString(),
          group: stats.gid.toString(),
          isDirectory,
          isFile,
          permissions: (stats.mode & 0o777).toString(8)
        });
      });
    });
  }

  async rmdir(path: string): Promise<void> {
    this.ensureConnected();
    
    return new Promise<void>((resolve, reject) => {
      this.sftp.rmdir(path, (err: Error | null) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  async unlink(path: string): Promise<void> {
    return this.delete(path);
  }

  async copyFile(sourcePath: string, targetPath: string): Promise<void> {
    const content = await this.readFile(sourcePath);
    await this.writeFile(targetPath, content);
  }

  async moveFile(sourcePath: string, targetPath: string): Promise<void> {
    await this.copyFile(sourcePath, targetPath);
    await this.delete(sourcePath);
  }

  async exists(path: string): Promise<boolean> {
    try {
      await this.stat(path);
      return true;
    } catch {
      return false;
    }
  }

  async test(): Promise<boolean> {
    try {
      await this.stat('/');
      return true;
    } catch {
      return false;
    }
  }
}


