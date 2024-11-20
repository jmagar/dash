import { Client as SSHClient, SFTPWrapper } from 'ssh2';
import { FileSystemProvider, FileSystemCredentials, FileSystemStats, FileSystemType } from './types';
import { FileItem } from '../../../types/models-shared';

export class SFTPProvider implements FileSystemProvider {
  readonly type: FileSystemType = 'sftp';
  private client: SSHClient | null = null;
  private sftp: SFTPWrapper | null = null;

  async connect(credentials: FileSystemCredentials): Promise<void> {
    if (credentials.type !== 'sftp') {
      throw new Error('Invalid credentials type for SFTP provider');
    }

    return new Promise((resolve, reject) => {
      this.client = new SSHClient();

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

      const connectConfig: any = {
        host: credentials.host,
        port: credentials.port || 22,
        username: credentials.username,
      };

      if (credentials.privateKey) {
        connectConfig.privateKey = credentials.privateKey;
      } else if (credentials.password) {
        connectConfig.password = credentials.password;
      }

      this.client.connect(connectConfig);
    });
  }

  async disconnect(): Promise<void> {
    if (this.sftp) {
      this.sftp.end();
      this.sftp = null;
    }
    if (this.client) {
      this.client.end();
      this.client = null;
    }
  }

  private ensureConnected(): void {
    if (!this.sftp) {
      throw new Error('SFTP connection not established');
    }
  }

  async listFiles(path: string): Promise<FileItem[]> {
    this.ensureConnected();
    return new Promise((resolve, reject) => {
      this.sftp!.readdir(path, (err, list) => {
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
  }

  async readFile(path: string): Promise<Buffer> {
    this.ensureConnected();
    return new Promise((resolve, reject) => {
      this.sftp!.readFile(path, (err, data) => {
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
    return new Promise((resolve, reject) => {
      this.sftp!.writeFile(path, content, (err) => {
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
    const stats = await this.stat(path);

    return new Promise((resolve, reject) => {
      const operation = stats.isDirectory ? 'rmdir' : 'unlink';
      this.sftp![operation](path, (err) => {
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
    return new Promise((resolve, reject) => {
      this.sftp!.rename(oldPath, newPath, (err) => {
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
    return new Promise((resolve, reject) => {
      this.sftp!.mkdir(path, (err) => {
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
    return new Promise((resolve, reject) => {
      this.sftp!.stat(path, (err, stats) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({
          size: stats.size,
          mtime: stats.mtime,
          isDirectory: stats.isDirectory(),
          isFile: stats.isFile(),
          permissions: (stats.mode & 0o777).toString(8),
        });
      });
    });
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
      await this.listFiles('/');
      return true;
    } catch {
      return false;
    }
  }
}
