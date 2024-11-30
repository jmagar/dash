import { spawn } from 'child_process';
import { FileSystemProvider, FileSystemCredentials, FileSystemType, FileSystemStats } from './types';
import { FileItem } from '../../../types/models-shared';
import { logger } from '../../../logger';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export class RcloneProvider implements FileSystemProvider {
  readonly type: FileSystemType = 'rclone';
  private remoteName: string = '';
  private configPath: string = '';

  async connect(credentials: FileSystemCredentials): Promise<void> {
    if (!credentials.rcloneConfig || !credentials.remoteName) {
      throw new Error('Missing required Rclone credentials');
    }

    // Create temporary directory for this connection
    const tempDir = await fs.mkdtemp(join(tmpdir(), 'rclone-'));
    this.configPath = join(tempDir, 'rclone.conf');
    this.remoteName = credentials.remoteName;

    try {
      // Write rclone config to temporary file
      await fs.writeFile(this.configPath, credentials.rcloneConfig);
      // Test connection by listing root directory
      await this.listFiles('/');
    } catch (error) {
      logger.error('Rclone connection error:', error);
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
        await fs.rmdir(join(this.configPath, '..'));
      }
    } catch (error) {
      logger.error('Error cleaning up Rclone provider:', error);
    } finally {
      this.remoteName = '';
      this.configPath = '';
    }
  }

  private async executeRcloneCommand(args: string[]): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const process = spawn('rclone', ['--config', this.configPath, ...args]);
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Rclone command failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (err) => {
        reject(err);
      });
    });
  }

  async listFiles(path: string): Promise<FileItem[]> {
    try {
      const { stdout } = await this.executeRcloneCommand(['lsjson', `${this.remoteName}:${path}`]);
      const items = JSON.parse(stdout);

      return items.map((item: any) => ({
        name: item.Name,
        path: `${path}/${item.Name}`.replace(/\/+/g, '/'),
        size: item.Size,
        modifiedTime: new Date(item.ModTime),
        isDirectory: item.IsDir,
        type: item.IsDir ? 'directory' : 'file',
        metadata: {
          mimeType: item.MimeType,
          encrypted: item.Encrypted
        }
      }));
    } catch (error) {
      logger.error('Rclone list files error:', error);
      throw error;
    }
  }

  async readFile(path: string): Promise<Buffer> {
    try {
      const { stdout } = await this.executeRcloneCommand(['cat', `${this.remoteName}:${path}`]);
      return Buffer.from(stdout);
    } catch (error) {
      logger.error('Rclone read file error:', error);
      throw error;
    }
  }

  async writeFile(path: string, content: Buffer): Promise<void> {
    const tempPath = join(tmpdir(), Math.random().toString(36).substring(7));
    try {
      await fs.writeFile(tempPath, content);
      await this.executeRcloneCommand(['copyto', tempPath, `${this.remoteName}:${path}`]);
    } catch (error) {
      logger.error('Rclone write file error:', error);
      throw error;
    } finally {
      await fs.unlink(tempPath).catch(() => {});
    }
  }

  async delete(path: string): Promise<void> {
    try {
      await this.executeRcloneCommand(['delete', `${this.remoteName}:${path}`]);
    } catch (error) {
      logger.error('Rclone delete error:', error);
      throw error;
    }
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    try {
      await this.executeRcloneCommand([
        'moveto',
        `${this.remoteName}:${oldPath}`,
        `${this.remoteName}:${newPath}`
      ]);
    } catch (error) {
      logger.error('Rclone rename error:', error);
      throw error;
    }
  }

  async mkdir(path: string): Promise<void> {
    try {
      await this.executeRcloneCommand(['mkdir', `${this.remoteName}:${path}`]);
    } catch (error) {
      logger.error('Rclone mkdir error:', error);
      throw error;
    }
  }

  async stat(path: string): Promise<FileSystemStats> {
    if (!this.configPath) throw new Error('Not connected');

    try {
      const { stdout } = await this.executeRcloneCommand(['lsjson', `${this.remoteName}:${path}`, '--stat']);
      const stats = JSON.parse(stdout)[0];
      const modTime = new Date(stats.ModTime).getTime();

      return {
        size: stats.Size || 0,
        mtime: Math.floor(modTime / 1000),
        mode: 0o644, // Rclone doesn't provide Unix permissions
        modTime: modTime,
        owner: '', // Rclone doesn't provide ownership info
        group: '', // Rclone doesn't provide group info
        isDirectory: stats.IsDir,
        isFile: !stats.IsDir,
        permissions: '644' // Default permissions since Rclone doesn't provide this
      };
    } catch (error) {
      logger.error('Rclone stat error:', error);
      throw error;
    }
  }

  async copyFile(sourcePath: string, targetPath: string): Promise<void> {
    try {
      await this.executeRcloneCommand([
        'copyto',
        `${this.remoteName}:${sourcePath}`,
        `${this.remoteName}:${targetPath}`
      ]);
    } catch (error) {
      logger.error('Rclone copy file error:', error);
      throw error;
    }
  }

  async moveFile(sourcePath: string, targetPath: string): Promise<void> {
    try {
      await this.executeRcloneCommand([
        'moveto',
        `${this.remoteName}:${sourcePath}`,
        `${this.remoteName}:${targetPath}`
      ]);
    } catch (error) {
      logger.error('Rclone move file error:', error);
      throw error;
    }
  }

  async rmdir(path: string): Promise<void> {
    try {
      await this.executeRcloneCommand(['rmdir', `${this.remoteName}:${path}`]);
    } catch (error) {
      logger.error('Rclone rmdir error:', error);
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
