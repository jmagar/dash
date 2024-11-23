import { createClient, WebDAVClient, FileStat } from 'webdav';
import { FileSystemProvider, FileSystemCredentials, FileSystemStats, FileSystemType } from './types';
import { FileItem } from '../../../types/models-shared';

export class WebDAVProvider implements FileSystemProvider {
  readonly type: FileSystemType = 'webdav';
  private client: WebDAVClient | null = null;

  async connect(credentials: FileSystemCredentials): Promise<void> {
    if (credentials.type !== 'webdav') {
      throw new Error('Invalid credentials type for WebDAV provider');
    }

    if (!credentials.baseUrl) {
      throw new Error('Missing required WebDAV base URL');
    }

    this.client = createClient(credentials.baseUrl, {
      username: credentials.username,
      password: credentials.password,
      digest: credentials.digest || false,
    });

    // Test connection
    try {
      await this.client.getDirectoryContents('/');
    } catch (error) {
      this.client = null;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.client = null;
  }

  private ensureConnected(): void {
    if (!this.client) {
      throw new Error('WebDAV connection not established');
    }
  }

  async listFiles(path: string): Promise<FileItem[]> {
    if (!this.client) {
      throw new Error('WebDAV client not connected');
    }

    const contents = await this.client.getDirectoryContents(path);
    return contents.map(item => ({
      name: item.basename,
      path: item.filename,
      type: item.type,
      size: item.size,
      modifiedTime: new Date(item.lastmod),
      permissions: '644' // WebDAV doesn't provide Unix permissions
    }));
  }

  async readFile(path: string): Promise<Buffer> {
    this.ensureConnected();
    const response = await this.client!.getFileContents(path);
    return Buffer.from(response as ArrayBuffer);
  }

  async writeFile(path: string, content: Buffer): Promise<void> {
    this.ensureConnected();
    await this.client!.putFileContents(path, content);
  }

  async delete(path: string): Promise<void> {
    this.ensureConnected();
    await this.client!.deleteFile(path);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    this.ensureConnected();
    await this.client!.moveFile(oldPath, newPath);
  }

  async mkdir(path: string): Promise<void> {
    this.ensureConnected();
    await this.client!.createDirectory(path);
  }

  async stat(path: string): Promise<FileSystemStats> {
    this.ensureConnected();
    const stat = await this.client!.stat(path);
    return {
      size: stat.size,
      mtime: new Date(stat.lastmod).getTime() / 1000,
      isDirectory: stat.type === 'directory',
      isFile: stat.type === 'file',
      permissions: '644', // WebDAV doesn't provide Unix permissions
    };
  }

  async exists(path: string): Promise<boolean> {
    this.ensureConnected();
    return this.client!.exists(path);
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
