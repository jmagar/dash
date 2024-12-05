import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { Injectable } from '@nestjs/common';
import { LoggerAdapter } from '../../../utils/logging/logger.adapter';
import { LoggingManager } from '../../../managers/LoggingManager';
import { FileSystemConfigService } from '../filesystem-config.service';
import type { Logger, LogMetadata } from '../../../../types/logger';
import type { BackupOptions, FileVersion, BackupStorage } from './backup.types';

/**
 * Handles file storage operations for backups.
 * Responsible for:
 * - Creating backup files
 * - Restoring from backups
 * - Managing backup paths
 * - File operations (read/write/hash)
 */
@Injectable()
export class BackupStorageService implements BackupStorage {
  private readonly logger: Logger;
  private readonly BACKUP_SUFFIX = '.backup';

  constructor(
    private readonly config: FileSystemConfigService,
    logManager?: LoggingManager
  ) {
    const baseLogger = logManager || LoggingManager.getInstance();
    this.logger = new LoggerAdapter(baseLogger, { 
      component: 'BackupStorage',
      service: 'FileSystem'
    });
  }

  /**
   * Creates a backup of a file
   * @param filePath Path to the file to backup
   * @param options Backup configuration options
   * @returns Information about the created backup
   */
  async createBackup(filePath: string, options: BackupOptions): Promise<FileVersion> {
    const backupDir = await this.getBackupDirectory(options.backupPath);
    const backupPath = this.generateBackupPath(filePath, backupDir);

    try {
      // Read source file
      const content = await fs.readFile(filePath);
      
      // Create backup directory if needed
      await fs.mkdir(path.dirname(backupPath), { recursive: true });
      
      // Write backup file
      await fs.writeFile(backupPath, content);

      // Get file stats
      const stats = await fs.stat(backupPath);

      // Create version info
      const version: FileVersion = {
        path: backupPath,
        timestamp: Date.now(),
        hash: this.calculateHash(content),
        size: stats.size,
        metadata: options.includeMetadata 
          ? await this.extractMetadata(filePath)
          : undefined
      };

      this.logger.info('Backup file created', {
        sourcePath: filePath,
        backupPath,
        size: stats.size
      });

      return version;
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        sourcePath: filePath,
        backupPath,
        operation: 'createBackup'
      };
      this.logger.error('Failed to create backup file', metadata);
      throw error;
    }
  }

  /**
   * Restores a file from a backup
   * @param backupPath Path to the backup file
   * @param targetPath Path to restore to
   */
  async restoreBackup(backupPath: string, targetPath: string): Promise<void> {
    try {
      const content = await fs.readFile(backupPath);
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.writeFile(targetPath, content);

      this.logger.info('Backup restored', {
        backupPath,
        targetPath,
        size: content.length
      });
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        backupPath,
        targetPath,
        operation: 'restoreBackup'
      };
      this.logger.error('Failed to restore backup', metadata);
      throw error;
    }
  }

  /**
   * Gets the original file path from a backup path
   * @param backupPath Path to the backup file
   * @returns Original file path
   */
  getOriginalPath(backupPath: string): string {
    const filename = path.basename(backupPath);
    const parts = filename.split('-');
    if (!parts[0]) {
      throw new Error('Invalid backup filename format');
    }
    const originalName = parts[0].replace(/_/g, path.sep);
    return originalName.replace(this.BACKUP_SUFFIX, '');
  }

  private async getBackupDirectory(customPath?: string): Promise<string> {
    const backupPath = customPath || 
      path.join(this.config.getBasePath(), 'backups');

    await fs.mkdir(backupPath, { recursive: true });
    return backupPath;
  }

  private generateBackupPath(filePath: string, backupDir: string): string {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const prefix = this.getBackupPrefix(filePath);
    
    return path.join(
      backupDir,
      `${prefix}-${timestamp}-${randomString}${this.BACKUP_SUFFIX}`
    );
  }

  private getBackupPrefix(filePath: string): string {
    const basename = path.basename(filePath);
    const dirname = path.dirname(filePath);
    const sanitizedDirname = dirname.replace(/[^a-zA-Z0-9]/g, '_');
    return `${sanitizedDirname}_${basename}`;
  }

  private calculateHash(content: Buffer): string {
    const hash = crypto.createHash('sha256');
    hash.update(content);
    return hash.digest('hex');
  }

  private async extractMetadata(filePath: string): Promise<Record<string, unknown>> {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        mode: stats.mode,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
      };
    } catch {
      return {};
    }
  }
}
