import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { Injectable } from '@nestjs/common';
import { LoggerAdapter } from '../../../utils/logging/logger.adapter';
import { LoggingManager } from '../../../managers/LoggingManager';
import { FileSystemConfigService } from '../filesystem-config.service';
import type { Logger, LogMetadata } from '../../../../types/logger';
import type { FileVersion, BackupVersioning } from './backup.types';

/**
 * Manages backup versions and cleanup.
 * Responsible for:
 * - Listing backup versions
 * - Managing version retention
 * - Cleaning up old backups
 * - Version metadata
 */
@Injectable()
export class BackupVersioningService implements BackupVersioning {
  private readonly logger: Logger;
  private readonly DEFAULT_MAX_VERSIONS = 5;

  constructor(
    private readonly config: FileSystemConfigService,
    logManager?: LoggingManager
  ) {
    const baseLogger = logManager || LoggingManager.getInstance();
    this.logger = new LoggerAdapter(baseLogger, { 
      component: 'BackupVersioning',
      service: 'FileSystem'
    });
  }

  /**
   * Lists all backup versions for a file
   * @param filePath Path to the original file
   * @returns List of backup versions sorted by timestamp (newest first)
   */
  async listVersions(filePath: string): Promise<FileVersion[]> {
    try {
      const backupDir = await this.getBackupDirectory();
      const prefix = this.getBackupPrefix(filePath);

      // Find backup files for this path
      const backupFiles = await fs.readdir(backupDir)
        .then(files => files.filter(file => 
          file.startsWith(prefix)
        ));

      // Collect version details
      const versions = await Promise.all(
        backupFiles.map(async (file) => {
          const fullPath = path.join(backupDir, file);
          const stats = await fs.stat(fullPath);
          const content = await fs.readFile(fullPath);
          
          return {
            path: fullPath,
            timestamp: stats.mtime.getTime(),
            hash: this.calculateHash(content),
            size: stats.size
          };
        })
      );

      // Sort versions by timestamp (newest first)
      return versions.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        filePath,
        operation: 'listVersions'
      };
      this.logger.error('Failed to list backup versions', metadata);
      throw error;
    }
  }

  /**
   * Manages version retention and cleanup
   * @param filePath Path to the original file
   * @param maxVersions Maximum number of versions to keep
   */
  async manageVersions(filePath: string, maxVersions?: number): Promise<void> {
    const limit = maxVersions || this.DEFAULT_MAX_VERSIONS;
    
    try {
      const backupDir = await this.getBackupDirectory();
      const prefix = this.getBackupPrefix(filePath);

      // Find backup files for this path
      const backupFiles = await fs.readdir(backupDir)
        .then(files => files.filter(file => 
          file.startsWith(prefix)
        ));

      // Sort backup files by timestamp
      const sortedBackups = await Promise.all(
        backupFiles.map(async (file) => {
          const fullPath = path.join(backupDir, file);
          const stats = await fs.stat(fullPath);
          return { file, timestamp: stats.mtime.getTime() };
        })
      ).then(files => files.sort((a, b) => b.timestamp - a.timestamp));

      // Delete oldest backups if exceeding limit
      const backupsToDelete = sortedBackups.slice(limit);
      
      if (backupsToDelete.length > 0) {
        await Promise.all(
          backupsToDelete.map(backup => 
            fs.unlink(path.join(backupDir, backup.file))
          )
        );

        this.logger.info('Cleaned up old backups', {
          filePath,
          deletedCount: backupsToDelete.length,
          remainingCount: sortedBackups.length - backupsToDelete.length
        });
      }
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        filePath,
        maxVersions: limit,
        operation: 'manageVersions'
      };
      this.logger.error('Failed to manage backup versions', metadata);
      throw error;
    }
  }

  private async getBackupDirectory(): Promise<string> {
    const backupPath = path.join(this.config.getBasePath(), 'backups');
    await fs.mkdir(backupPath, { recursive: true });
    return backupPath;
  }

  private getBackupPrefix(filePath: string): string {
    const basename = path.basename(filePath);
    const dirname = path.dirname(filePath);
    const sanitizedDirname = dirname.replace(/[^a-zA-Z0-9]/g, '_');
    return `${sanitizedDirname}_${basename}`;
  }

  private calculateHash(content: Buffer): string {
    return crypto
      .createHash('sha256')
      .update(content)
      .digest('hex');
  }
}
