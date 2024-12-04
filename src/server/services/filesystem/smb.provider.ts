import SMB2 from '@marsaud/smb2';
import { FileSystemProvider, FileSystemCredentials, FileSystemType, FileSystemStats } from './types';
import { FileItem } from '../../../types/models-shared';
import logger from '../../../logger';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { LoggingManager } from '../../managers/utils/LoggingManager';

export class SMBProvider implements FileSystemProvider {
  readonly type = 'smb' as FileSystemType;
  private client: SMB2 | null = null;

  async connect(credentials: FileSystemCredentials): Promise<void> {
    if (!credentials.host || !credentials.username) {
      throw new Error('Missing required SMB credentials');
    }

    try {
      this.client = new SMB2({
        share: `\\\\${credentials.host}\\${credentials.share || ''}`,
        domain: credentials.domain || '',
        username: credentials.username,
        password: credentials.password,
      });

      // Test connection
      await this.client.readdir('/');
    } catch (error) {
      loggerLoggingManager.getInstance().();
      this.client = null;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
    }
  }

  async listFiles(path: string): Promise<FileItem[]> {
    if (!this.client) throw new Error('Not connected');

    try {
      const files = await this.client.readdir(path);
      const fileStats = await Promise.all(
        files.map(async (name) => {
          const filePath = `${path}/${name}`.replace(/\/+/g, '/');
          const stats = await this.client!.stat(filePath);
          return {
            name,
            path: filePath,
            size: stats.size,
            modifiedTime: new Date(stats.mtime),
            isDirectory: stats.isDirectory(),
            type: stats.isDirectory() ? 'directory' : 'file',
            metadata: {
              mode: stats.mode,
              uid: stats.uid,
              gid: stats.gid
            }
          };
        })
      );
      return fileStats;
    } catch (error) {
      loggerLoggingManager.getInstance().();
      throw error;
    }
  }

  async readFile(path: string): Promise<Buffer> {
    if (!this.client) throw new Error('Not connected');

    try {
      const tempPath = join(tmpdir(), Math.random().toString(36).substring(7));
      await this.client.readFile(path, { encoding: null });
      const content = await fs.readFile(tempPath);
      await fs.unlink(tempPath);
      return content;
    } catch (error) {
      loggerLoggingManager.getInstance().();
      throw error;
    }
  }

  async writeFile(path: string, content: Buffer): Promise<void> {
    if (!this.client) throw new Error('Not connected');

    try {
      const tempPath = join(tmpdir(), Math.random().toString(36).substring(7));
      await fs.writeFile(tempPath, content);
      await this.client.writeFile(path, tempPath);
      await fs.unlink(tempPath);
    } catch (error) {
      loggerLoggingManager.getInstance().();
      throw error;
    }
  }

  async delete(path: string): Promise<void> {
    if (!this.client) throw new Error('Not connected');

    try {
      await this.client.unlink(path);
    } catch (error) {
      loggerLoggingManager.getInstance().();
      throw error;
    }
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    if (!this.client) throw new Error('Not connected');

    try {
      await this.client.rename(oldPath, newPath);
    } catch (error) {
      loggerLoggingManager.getInstance().();
      throw error;
    }
  }

  async mkdir(path: string): Promise<void> {
    if (!this.client) throw new Error('Not connected');

    try {
      await this.client.mkdir(path);
    } catch (error) {
      loggerLoggingManager.getInstance().();
      throw error;
    }
  }

  async stat(path: string): Promise<FileSystemStats> {
    if (!this.client) throw new Error('Not connected');

    try {
      const stat = await this.client.stat(path);
      const modTime = new Date(stat.lastModified).getTime();

      return {
        size: stat.size,
        mtime: Math.floor(modTime / 1000),
        mode: 0o644, // SMB doesn't provide Unix permissions
        modTime: modTime,
        owner: '', // SMB doesn't provide ownership info in a Unix-compatible way
        group: '', // SMB doesn't provide group info in a Unix-compatible way
        isDirectory: stat.isDirectory(),
        isFile: !stat.isDirectory(),
        permissions: '644' // Default permissions since SMB doesn't provide Unix-style permissions
      };
    } catch (error) {
      loggerLoggingManager.getInstance().();
      throw error;
    }
  }

  async copyFile(sourcePath: string, targetPath: string): Promise<void> {
    if (!this.client) throw new Error('Not connected');

    try {
      const content = await this.readFile(sourcePath);
      await this.writeFile(targetPath, content);
    } catch (error) {
      loggerLoggingManager.getInstance().();
      throw error;
    }
  }

  async moveFile(sourcePath: string, targetPath: string): Promise<void> {
    await this.rename(sourcePath, targetPath);
  }

  async rmdir(path: string): Promise<void> {
    if (!this.client) throw new Error('Not connected');

    try {
      await this.client.rmdir(path);
    } catch (error) {
      loggerLoggingManager.getInstance().();
      throw error;
    }
  }

  async unlink(path: string): Promise<void> {
    return this.delete(path);
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


