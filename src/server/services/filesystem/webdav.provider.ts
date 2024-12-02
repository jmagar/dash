import { createClient, WebDAVClient, FileStat } from 'webdav';
import { FileSystemProvider, FileSystemCredentials, FileSystemType, FileSystemStats } from './types';
import { FileItem } from '../../../types/models-shared';
import { logger } from '../../utils/logger';

export class WebDAVProvider implements FileSystemProvider {
  readonly type = 'webdav' as FileSystemType;
  private client: WebDAVClient | null = null;

  async connect(credentials: FileSystemCredentials & { baseUrl: string }): Promise<void> {
    if (!credentials.baseUrl) {
      throw new Error('Missing required WebDAV credentials');
    }

    try {
      this.client = createClient(credentials.baseUrl, {
        username: credentials.username,
        password: credentials.password,
      });

      // Test connection
      await this.client.getDirectoryContents('/');
    } catch (error) {
      logger.error('WebDAV connection error:', error);
      this.client = null;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.client = null;
  }

  async listFiles(path: string): Promise<FileItem[]> {
    if (!this.client) throw new Error('Not connected');

    try {
      const contents = await this.client.getDirectoryContents(path) as FileStat[];
      return contents.map(item => ({
        name: item.basename,
        path: `${path}/${item.basename}`.replace(/\/+/g, '/'),
        size: item.size,
        modifiedTime: new Date(item.lastmod),
        isDirectory: item.type === 'directory',
        type: item.type === 'directory' ? 'directory' : 'file',
        metadata: {
          etag: item.etag,
          mimeType: item.type === 'directory' ? 'directory' : item.mime || 'application/octet-stream'
        }
      }));
    } catch (error) {
      logger.error('WebDAV list files error:', error);
      throw error;
    }
  }

  async readFile(path: string): Promise<Buffer> {
    if (!this.client) throw new Error('Not connected');

    try {
      const response = await this.client.getFileContents(path);
      if (response instanceof ArrayBuffer) {
        return Buffer.from(response);
      }
      return Buffer.from(response as Buffer);
    } catch (error) {
      logger.error('WebDAV read file error:', error);
      throw error;
    }
  }

  async writeFile(path: string, content: Buffer): Promise<void> {
    if (!this.client) throw new Error('Not connected');

    try {
      await this.client.putFileContents(path, content);
    } catch (error) {
      logger.error('WebDAV write file error:', error);
      throw error;
    }
  }

  async delete(path: string): Promise<void> {
    if (!this.client) throw new Error('Not connected');

    try {
      await this.client.deleteFile(path);
    } catch (error) {
      logger.error('WebDAV delete error:', error);
      throw error;
    }
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    if (!this.client) throw new Error('Not connected');

    try {
      await this.client.moveFile(oldPath, newPath);
    } catch (error) {
      logger.error('WebDAV rename error:', error);
      throw error;
    }
  }

  async mkdir(path: string): Promise<void> {
    if (!this.client) throw new Error('Not connected');

    try {
      await this.client.createDirectory(path);
    } catch (error) {
      logger.error('WebDAV mkdir error:', error);
      throw error;
    }
  }

  async stat(path: string): Promise<FileSystemStats> {
    if (!this.client) throw new Error('Not connected');

    try {
      const stat = await this.client.stat(path) as FileStat;
      const modTime = new Date(stat.lastmod).getTime();

      return {
        size: stat.size || 0,
        mtime: Math.floor(modTime / 1000),  // Convert to seconds
        mode: 0o644, // WebDAV doesn't provide Unix permissions
        modTime: modTime,
        owner: '', // WebDAV doesn't provide ownership info
        group: '', // WebDAV doesn't provide group info
        isDirectory: stat.type === 'directory',
        isFile: stat.type === 'file',
        permissions: '644' // Default permissions since WebDAV doesn't provide this
      };
    } catch (error) {
      logger.error('WebDAV stat error:', error);
      throw error;
    }
  }

  async copyFile(sourcePath: string, targetPath: string): Promise<void> {
    if (!this.client) throw new Error('Not connected');

    try {
      await this.client.copyFile(sourcePath, targetPath);
    } catch (error) {
      logger.error('WebDAV copy file error:', error);
      throw error;
    }
  }

  async moveFile(sourcePath: string, targetPath: string): Promise<void> {
    if (!this.client) throw new Error('Not connected');

    try {
      await this.client.moveFile(sourcePath, targetPath);
    } catch (error) {
      logger.error('WebDAV move file error:', error);
      throw error;
    }
  }

  async rmdir(path: string): Promise<void> {
    return this.delete(path);
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
