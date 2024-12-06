import { createClient, WebDAVClient } from 'webdav';
import { FileSystemProvider, FileSystemCredentials, FileSystemType, FileSystemStats } from './types';
import { LoggingService } from '../../services/logging/logging.service';

const logger = new LoggingService({ component: 'WebDAVProvider' });

export class WebDAVProvider implements FileSystemProvider {
  readonly type = 'webdav' as FileSystemType;
  private client: WebDAVClient | null = null;
  private baseUrl: string | null = null;
  private credentials: FileSystemCredentials | null = null;

  async connect(): Promise<void> {
    if (!this.credentials?.url) {
      throw new Error('WebDAV credentials not configured');
    }

    try {
      this.baseUrl = this.credentials.url;
      this.client = createClient(this.baseUrl, {
        username: this.credentials.username,
        password: this.credentials.password
      });

      // Test connection
      await this.client.getDirectoryContents('/');
    } catch (error) {
      logger.error('Failed to connect to WebDAV server', {
        error: error instanceof Error ? error : new Error(String(error)),
        baseUrl: this.baseUrl
      });
      this.client = null;
      throw error;
    }
  }

  disconnect(): Promise<void> {
    this.client = null;
    this.baseUrl = null;
    this.credentials = null;
    return Promise.resolve();
  }

  async list(path: string): Promise<string[]> {
    if (!this.client) throw new Error('Not connected');

    try {
      const contents = await this.client.getDirectoryContents(path);
      return contents.map(item => item.basename);
    } catch (error) {
      logger.error('Failed to list files', {
        error: error instanceof Error ? error : new Error(String(error)),
        path
      });
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
      if (Buffer.isBuffer(response)) {
        return response;
      }
      return Buffer.from(response);
    } catch (error) {
      logger.error('Failed to read file', {
        error: error instanceof Error ? error : new Error(String(error)),
        path
      });
      throw error;
    }
  }

  async writeFile(path: string, content: Buffer): Promise<void> {
    if (!this.client) throw new Error('Not connected');

    try {
      await this.client.putFileContents(path, content);
    } catch (error) {
      logger.error('Failed to write file', {
        error: error instanceof Error ? error : new Error(String(error)),
        path
      });
      throw error;
    }
  }

  async delete(path: string): Promise<void> {
    if (!this.client) throw new Error('Not connected');

    try {
      await this.client.deleteFile(path);
    } catch (error) {
      logger.error('Failed to delete file', {
        error: error instanceof Error ? error : new Error(String(error)),
        path
      });
      throw error;
    }
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    if (!this.client) throw new Error('Not connected');

    try {
      await this.client.moveFile(oldPath, newPath);
    } catch (error) {
      logger.error('Failed to rename file', {
        error: error instanceof Error ? error : new Error(String(error)),
        oldPath,
        newPath
      });
      throw error;
    }
  }

  async mkdir(path: string): Promise<void> {
    if (!this.client) throw new Error('Not connected');

    try {
      await this.client.createDirectory(path);
    } catch (error) {
      logger.error('Failed to create directory', {
        error: error instanceof Error ? error : new Error(String(error)),
        path
      });
      throw error;
    }
  }

  async stat(path: string): Promise<FileSystemStats> {
    if (!this.client) throw new Error('Not connected');

    try {
      const stat = await this.client.stat(path);
      return {
        size: stat.size || 0,
        isDirectory: stat.type === 'directory',
        isFile: stat.type === 'file',
        isSymbolicLink: false, // WebDAV doesn't support symlinks
        mtime: new Date(stat.lastmod),
        atime: new Date(stat.lastmod), // WebDAV only provides lastmod
        ctime: new Date(stat.lastmod), // WebDAV only provides lastmod
        birthtime: new Date(stat.lastmod) // WebDAV only provides lastmod
      };
    } catch (error) {
      logger.error('Failed to get file stats', {
        error: error instanceof Error ? error : new Error(String(error)),
        path
      });
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

  setCredentials(credentials: FileSystemCredentials): void {
    this.credentials = credentials;
  }
}
