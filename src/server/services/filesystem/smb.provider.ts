import SMB2 from '@marsaud/smb2';
import { FileSystemProvider, FileSystemCredentials, FileSystemStats, FileSystemType } from './types';
import { FileItem } from '../../../types/models-shared';

export class SMBProvider implements FileSystemProvider {
  readonly type: FileSystemType = 'smb';
  private client: SMB2 | null = null;
  private basePath: string = '';

  async connect(credentials: FileSystemCredentials): Promise<void> {
    if (credentials.type !== 'smb') {
      throw new Error('Invalid credentials type for SMB provider');
    }

    if (!credentials.host || !credentials.username || !credentials.share) {
      throw new Error('Missing required SMB credentials');
    }

    this.client = new SMB2({
      share: `\\\\${credentials.host}\\${credentials.share}`,
      domain: credentials.domain || '',
      username: credentials.username,
      password: credentials.password || '',
      port: credentials.port || 445,
      autoCloseTimeout: 0, // Don't auto close
    });

    // Test connection by trying to read the root directory
    try {
      await this.client.readdir('/');
    } catch (error) {
      this.client = null;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
  }

  private ensureConnected(): void {
    if (!this.client) {
      throw new Error('SMB connection not established');
    }
  }

  async listFiles(path: string): Promise<FileItem[]> {
    this.ensureConnected();
    const normalizedPath = this.normalizePath(path);
    
    const files = await this.client!.readdir(normalizedPath, { stats: true });
    return files.map(file => ({
      name: file.name,
      path: `${path}/${file.name}`.replace(/\/+/g, '/'),
      isDirectory: file.stats.isDirectory(),
      size: file.stats.size,
      modifiedTime: new Date(file.stats.mtime).toISOString(),
      permissions: (file.stats.mode & 0o777).toString(8),
    }));
  }

  async readFile(path: string): Promise<Buffer> {
    this.ensureConnected();
    return this.client!.readFile(this.normalizePath(path));
  }

  async writeFile(path: string, content: Buffer): Promise<void> {
    this.ensureConnected();
    await this.client!.writeFile(this.normalizePath(path), content);
  }

  async delete(path: string): Promise<void> {
    this.ensureConnected();
    const stats = await this.stat(path);
    const normalizedPath = this.normalizePath(path);

    if (stats.isDirectory) {
      await this.client!.rmdir(normalizedPath, { recursive: true });
    } else {
      await this.client!.unlink(normalizedPath);
    }
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    this.ensureConnected();
    await this.client!.rename(
      this.normalizePath(oldPath),
      this.normalizePath(newPath)
    );
  }

  async mkdir(path: string): Promise<void> {
    this.ensureConnected();
    await this.client!.mkdir(this.normalizePath(path));
  }

  async stat(path: string): Promise<FileSystemStats> {
    this.ensureConnected();
    const stats = await this.client!.stat(this.normalizePath(path));
    return {
      size: stats.size,
      mtime: stats.mtime.getTime() / 1000,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      permissions: (stats.mode & 0o777).toString(8),
    };
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

  private normalizePath(path: string): string {
    // Convert Unix-style paths to Windows-style for SMB
    return path.replace(/\//g, '\\');
  }
}
