import SMB2 from '@marsaud/smb2';
import { FileSystemProvider, FileSystemCredentials, FileSystemType, FileSystemStats } from './types';
import { LoggingManager } from '../../managers/LoggingManager';
import { LoggerAdapter } from '../../utils/logging/logger.adapter';
import type { Logger } from '../../../types/logger';
import { createApiError } from '../../utils/error';

export class SMBProvider implements FileSystemProvider {
  readonly type = 'smb' as FileSystemType;
  private client: SMB2 | null = null;
  private readonly logger: Logger;
  private credentials?: FileSystemCredentials;

  constructor() {
    this.logger = new LoggerAdapter(LoggingManager.getInstance(), {
      component: 'SMBProvider',
      service: 'FileSystem'
    });
  }

  async connect(): Promise<void> {
    if (!this.credentials?.host || !this.credentials?.username) {
      throw createApiError('Missing required SMB credentials', undefined, 400);
    }

    try {
      this.client = new SMB2({
        share: `\\\\${this.credentials.host}\\${this.credentials.share || ''}`,
        domain: this.credentials.domain || '',
        username: this.credentials.username,
        password: this.credentials.password || '',
      });

      // Test connection
      await this.client.readdir('/');
    } catch (error: unknown) {
      const metadata = {
        error: error instanceof Error ? error.message : String(error),
        host: this.credentials.host,
        share: this.credentials.share
      };
      this.logger.error('Failed to connect to SMB share', metadata);
      throw createApiError('Failed to connect to SMB share', error, 500, metadata);
    }
  }

  disconnect(): Promise<void> {
    if (this.client) {
      this.logger.info('Disconnecting from SMB share');
      this.client = null;
    }
    return Promise.resolve();
  }

  async list(path: string): Promise<string[]> {
    if (!this.client) {
      throw createApiError('Not connected to SMB share', undefined, 400);
    }

    try {
      return await this.client.readdir(path);
    } catch (error: unknown) {
      const metadata = {
        error: error instanceof Error ? error.message : String(error),
        path
      };
      this.logger.error('Failed to list directory', metadata);
      throw createApiError('Failed to list directory', error, 500, metadata);
    }
  }

  async readFile(path: string): Promise<Buffer> {
    if (!this.client) {
      throw createApiError('Not connected to SMB share', undefined, 400);
    }

    try {
      const data = await this.client.readFile(path);
      return Buffer.from(data);
    } catch (error: unknown) {
      const metadata = {
        error: error instanceof Error ? error.message : String(error),
        path
      };
      this.logger.error('Failed to read file', metadata);
      throw createApiError('Failed to read file', error, 500, metadata);
    }
  }

  async writeFile(path: string, data: Buffer): Promise<void> {
    if (!this.client) {
      throw createApiError('Not connected to SMB share', undefined, 400);
    }

    try {
      await this.client.writeFile(path, data);
    } catch (error: unknown) {
      const metadata = {
        error: error instanceof Error ? error.message : String(error),
        path
      };
      this.logger.error('Failed to write file', metadata);
      throw createApiError('Failed to write file', error, 500, metadata);
    }
  }

  async unlink(path: string): Promise<void> {
    if (!this.client) {
      throw createApiError('Not connected to SMB share', undefined, 400);
    }

    try {
      await this.client.unlink(path);
    } catch (error: unknown) {
      const metadata = {
        error: error instanceof Error ? error.message : String(error),
        path
      };
      this.logger.error('Failed to delete file', metadata);
      throw createApiError('Failed to delete file', error, 500, metadata);
    }
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    if (!this.client) {
      throw createApiError('Not connected to SMB share', undefined, 400);
    }

    try {
      await this.client.rename(oldPath, newPath);
    } catch (error: unknown) {
      const metadata = {
        error: error instanceof Error ? error.message : String(error),
        oldPath,
        newPath
      };
      this.logger.error('Failed to rename file', metadata);
      throw createApiError('Failed to rename file', error, 500, metadata);
    }
  }

  async mkdir(path: string): Promise<void> {
    if (!this.client) {
      throw createApiError('Not connected to SMB share', undefined, 400);
    }

    try {
      await this.client.mkdir(path);
    } catch (error: unknown) {
      const metadata = {
        error: error instanceof Error ? error.message : String(error),
        path
      };
      this.logger.error('Failed to create directory', metadata);
      throw createApiError('Failed to create directory', error, 500, metadata);
    }
  }

  async rmdir(path: string): Promise<void> {
    if (!this.client) {
      throw createApiError('Not connected to SMB share', undefined, 400);
    }

    try {
      await this.client.rmdir(path);
    } catch (error: unknown) {
      const metadata = {
        error: error instanceof Error ? error.message : String(error),
        path
      };
      this.logger.error('Failed to remove directory', metadata);
      throw createApiError('Failed to remove directory', error, 500, metadata);
    }
  }

  async stat(path: string): Promise<FileSystemStats> {
    if (!this.client) {
      throw createApiError('Not connected to SMB share', undefined, 400);
    }

    try {
      const stat = await this.client.stat(path);
      const isDirectory = stat.isDirectory();
      
      return {
        size: stat.size,
        isDirectory,
        isFile: !isDirectory,
        isSymbolicLink: false,
        mtime: stat.mtime ? new Date(stat.mtime) : undefined,
        atime: stat.atime ? new Date(stat.atime) : undefined,
        ctime: stat.ctime ? new Date(stat.ctime) : undefined,
        birthtime: undefined // SMB doesn't support birthtime
      };
    } catch (error: unknown) {
      const metadata = {
        error: error instanceof Error ? error.message : String(error),
        path
      };
      this.logger.error('Failed to get file stats', metadata);
      throw createApiError('Failed to get file stats', error, 500, metadata);
    }
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
