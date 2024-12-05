import * as fs from 'fs/promises';
import * as path from 'path';
import { Injectable } from '@nestjs/common';
import { LoggerAdapter } from '../../../utils/logging/logger.adapter';
import { LoggingManager } from '../../../managers/LoggingManager';
import { FileSystemConfigService } from '../filesystem-config.service';
import type { Logger, LogMetadata } from '../../../../types/logger';
import type { BackupValidation } from './backup.types';

/**
 * Handles path validation for backup operations.
 * Responsible for:
 * - Validating source file paths
 * - Validating backup paths
 * - Validating restore paths
 * - Path security checks
 */
@Injectable()
export class BackupValidationService implements BackupValidation {
  private readonly logger: Logger;
  private readonly BACKUP_SUFFIX = '.backup';

  constructor(
    private readonly config: FileSystemConfigService,
    logManager?: LoggingManager
  ) {
    const baseLogger = logManager || LoggingManager.getInstance();
    this.logger = new LoggerAdapter(baseLogger, { 
      component: 'BackupValidation',
      service: 'FileSystem'
    });
  }

  /**
   * Validates a source file path
   * @param filePath Path to validate
   * @throws If path is invalid or file doesn't exist
   */
  async validateSourcePath(filePath: string): Promise<void> {
    try {
      // Check if path is absolute
      if (!path.isAbsolute(filePath)) {
        throw new Error('Source path must be absolute');
      }

      // Check if path is within allowed directory
      const basePath = this.config.getBasePath();
      const normalizedPath = path.normalize(filePath);
      if (!normalizedPath.startsWith(basePath)) {
        throw new Error('Source path must be within allowed directory');
      }

      // Check if file exists and is readable
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        throw new Error('Source path must point to a file');
      }

      // Try to read file to verify access
      await fs.access(filePath, fs.constants.R_OK);

      this.logger.debug('Source path validated', {
        path: filePath,
        size: stats.size
      });
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        path: filePath,
        operation: 'validateSourcePath'
      };
      this.logger.error('Source path validation failed', metadata);
      throw error;
    }
  }

  /**
   * Validates a backup file path
   * @param backupPath Path to validate
   * @throws If path is invalid or file doesn't exist
   */
  async validateBackupPath(backupPath: string): Promise<void> {
    try {
      // Check if path is absolute
      if (!path.isAbsolute(backupPath)) {
        throw new Error('Backup path must be absolute');
      }

      // Check if path has correct suffix
      if (!backupPath.endsWith(this.BACKUP_SUFFIX)) {
        throw new Error('Backup path must end with .backup');
      }

      // Check if path is within backup directory
      const backupDir = path.join(this.config.getBasePath(), 'backups');
      const normalizedPath = path.normalize(backupPath);
      if (!normalizedPath.startsWith(backupDir)) {
        throw new Error('Backup path must be within backup directory');
      }

      // Check if file exists and is readable
      const stats = await fs.stat(backupPath);
      if (!stats.isFile()) {
        throw new Error('Backup path must point to a file');
      }

      // Try to read file to verify access
      await fs.access(backupPath, fs.constants.R_OK);

      this.logger.debug('Backup path validated', {
        path: backupPath,
        size: stats.size
      });
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        path: backupPath,
        operation: 'validateBackupPath'
      };
      this.logger.error('Backup path validation failed', metadata);
      throw error;
    }
  }

  /**
   * Validates a restore target path
   * @param targetPath Path to validate
   * @throws If path is invalid or not writable
   */
  async validateRestorePath(targetPath: string): Promise<void> {
    try {
      // Check if path is absolute
      if (!path.isAbsolute(targetPath)) {
        throw new Error('Restore path must be absolute');
      }

      // Check if path is within allowed directory
      const basePath = this.config.getBasePath();
      const normalizedPath = path.normalize(targetPath);
      if (!normalizedPath.startsWith(basePath)) {
        throw new Error('Restore path must be within allowed directory');
      }

      // Check if directory is writable
      const targetDir = path.dirname(targetPath);
      await fs.access(targetDir, fs.constants.W_OK).catch(async () => {
        // Try to create directory if it doesn't exist
        await fs.mkdir(targetDir, { recursive: true });
        // Verify we can write to it
        await fs.access(targetDir, fs.constants.W_OK);
      });

      this.logger.debug('Restore path validated', {
        path: targetPath
      });
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : String(error),
        path: targetPath,
        operation: 'validateRestorePath'
      };
      this.logger.error('Restore path validation failed', metadata);
      throw error;
    }
  }
}
