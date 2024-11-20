import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import { join } from 'path';
import { FileSystemProvider, FileSystemCredentials, FileSystemStats, FileSystemType } from './types';
import { FileItem } from '../../../types/models-shared';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

interface RcloneListItem {
  Path: string;
  Name: string;
  Size: number;
  MimeType: string;
  ModTime: string;
  IsDir: boolean;
}

export class RcloneProvider implements FileSystemProvider {
  readonly type: FileSystemType = 'rclone';
  private remoteName: string = '';
  private configPath: string = '';
  private tmpDir: string = '';

  async connect(credentials: FileSystemCredentials): Promise<void> {
    if (credentials.type !== 'rclone') {
      throw new Error('Invalid credentials type for Rclone provider');
    }

    if (!credentials.rcloneConfig || !credentials.remoteName) {
      throw new Error('Missing required Rclone configuration');
    }

    // Create temporary directory for this connection
    this.tmpDir = await fs.mkdtemp(join(tmpdir(), 'rclone-'));
    this.configPath = join(this.tmpDir, 'rclone.conf');
    this.remoteName = credentials.remoteName;

    // Write rclone config to temporary file
    await fs.writeFile(this.configPath, credentials.rcloneConfig);

    // Test connection
    try {
      await this.runRcloneCommand(['lsjson', `${this.remoteName}:/`]);
    } catch (error) {
      await this.cleanup();
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.cleanup();
  }

  private async cleanup(): Promise<void> {
    try {
      if (this.configPath) {
        await fs.unlink(this.configPath);
      }
      if (this.tmpDir) {
        await fs.rmdir(this.tmpDir);
      }
    } catch (error) {
      console.error('Error cleaning up Rclone provider:', error);
    }
  }

  private async runRcloneCommand(args: string[]): Promise<string> {
    const { stdout } = await execAsync(`rclone --config "${this.configPath}" ${args.join(' ')}`);
    return stdout;
  }

  async listFiles(path: string): Promise<FileItem[]> {
    const output = await this.runRcloneCommand(['lsjson', `${this.remoteName}:${path}`]);
    const items: RcloneListItem[] = JSON.parse(output);
    
    return items.map(item => ({
      name: item.Name,
      path: item.Path,
      isDirectory: item.IsDir,
      size: item.Size,
      modifiedTime: new Date(item.ModTime).toISOString(),
      permissions: '644', // Rclone doesn't provide Unix permissions
    }));
  }

  async readFile(path: string): Promise<Buffer> {
    const tempFile = join(this.tmpDir, 'temp-download');
    try {
      await this.runRcloneCommand(['copy', `${this.remoteName}:${path}`, tempFile]);
      return await fs.readFile(tempFile);
    } finally {
      await fs.unlink(tempFile).catch(() => {});
    }
  }

  async writeFile(path: string, content: Buffer): Promise<void> {
    const tempFile = join(this.tmpDir, 'temp-upload');
    try {
      await fs.writeFile(tempFile, content);
      await this.runRcloneCommand(['copy', tempFile, `${this.remoteName}:${path}`]);
    } finally {
      await fs.unlink(tempFile).catch(() => {});
    }
  }

  async delete(path: string): Promise<void> {
    await this.runRcloneCommand(['delete', `${this.remoteName}:${path}`]);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    await this.runRcloneCommand([
      'moveto',
      `${this.remoteName}:${oldPath}`,
      `${this.remoteName}:${newPath}`,
    ]);
  }

  async mkdir(path: string): Promise<void> {
    await this.runRcloneCommand(['mkdir', `${this.remoteName}:${path}`]);
  }

  async stat(path: string): Promise<FileSystemStats> {
    const output = await this.runRcloneCommand(['lsjson', `${this.remoteName}:${path}`]);
    const items: RcloneListItem[] = JSON.parse(output);
    
    if (items.length === 0) {
      throw new Error('File not found');
    }

    const item = items[0];
    return {
      size: item.Size,
      mtime: new Date(item.ModTime).getTime() / 1000,
      isDirectory: item.IsDir,
      isFile: !item.IsDir,
      permissions: '644', // Rclone doesn't provide Unix permissions
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
}
