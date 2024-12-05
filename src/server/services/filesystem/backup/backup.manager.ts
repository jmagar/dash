import { Injectable } from '@nestjs/common';
import { LoggerAdapter } from '../../../utils/logging/logger.adapter';
import { LoggingManager } from '../../../managers/LoggingManager';
import { FileSystemMetricsService } from '../filesystem-metrics.service';
import type { Logger, LogMetadata } from '../../../../types/logger';
import type {
  BackupOptions,
  FileVersion,
  BackupStorage,
  BackupVersioning,
  BackupValidation
} from './backup.types';

/**
 * Coordinates backup operations between storage, versioning, and validation services.
 * Each operation is delegated to a specialized service while this manager handles:
 * - Operation coordination
 * - Error handling
 * - Logging
 * - Metrics
 */
@Injectable()
export class BackupManager {
  private readonly logger: Logger;

  constructor(
    private readonly storage: BackupStorage,
    private readonly versioning: BackupVersioning,
    private readonly validation: BackupValidation,
    private readonly metrics: FileSystemMetricsService,
    logManager?: LoggingManager
  ) {
    // Use provided LoggingManager or get default instance
    const baseLogger = logManager || LoggingManager.getInstance();
    // Create logger adapter with component context
    this.logger = new LoggerAdapter(baseLogger, { 
      component: 'BackupManager',
      service: 'FileSystem'
    });
  }

  /**
   * Creates a new backup of a file
   * @param filePath Path to the file to backup
   * @param options Backup configuration options
   * @returns Information about the created backup version
   * @throws If validation fails or backup creation fails
   */
  async createBackup(filePath: string, options: BackupOptions = {}): Promise<FileVersion> {
    try {
      // Validate source path
      await this.validation.validateSourcePath(filePath);

      // Create backup
      const version = await this.storage.createBackup(filePath, options);

      // Manage versions
      await this.versioning.manageVersions(filePath, options.maxVersions);

      // Record metrics
      this.metrics.recordOperation({
        operation: 'create_backup',
        type: 'success',
        size: version.size
      });

      const metadata: LogMetadata = {
        sourcePath: filePath,
        backupPath: version.path,
        operation: 'createBackup'
      };
      this.logger.info('Backup created successfully', metadata);

      return version;
    } catch (error: unknown) {
      this.handleError('create', error, { filePath });
      throw error;
    }
  }

  /**
   * Restores a file from a backup
   * @param backupPath Path to the backup file
   * @param targetPath Optional path to restore to (defaults to original location)
   * @throws If validation fails or restore operation fails
   */
  async restoreBackup(backupPath: string, targetPath?: string): Promise<void> {
    try {
      // Validate paths
      await this.validation.validateBackupPath(backupPath);
      const restorePath = targetPath || this.storage.getOriginalPath(backupPath);
      await this.validation.validateRestorePath(restorePath);

      // Perform restore
      await this.storage.restoreBackup(backupPath, restorePath);

      const metadata: LogMetadata = {
        backupPath,
        restorePath,
        operation: 'restoreBackup'
      };
      this.logger.info('Backup restored successfully', metadata);
    } catch (error: unknown) {
      this.handleError('restore', error, { backupPath, targetPath });
      throw error;
    }
  }

  /**
   * Lists all backup versions for a file
   * @param filePath Path to the original file
   * @returns List of backup versions
   * @throws If validation fails or listing operation fails
   */
  async listVersions(filePath: string): Promise<FileVersion[]> {
    try {
      await this.validation.validateSourcePath(filePath);
      return this.versioning.listVersions(filePath);
    } catch (error: unknown) {
      this.handleError('list', error, { filePath });
      throw error;
    }
  }

  /**
   * Handles error logging and metrics recording
   * @param operation Name of the operation that failed
   * @param error Error that occurred
   * @param context Additional context for logging
   */
  private handleError(operation: string, error: unknown, context: Record<string, unknown>): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const metadata: LogMetadata = {
      error: errorMessage,
      operation: `backup_${operation}`,
      ...context
    };
    this.logger.error(`Backup ${operation} failed`, metadata);

    this.metrics.recordError(
      `backup_${operation}`,
      error instanceof Error ? error.name : 'UnknownError',
      error instanceof Error ? error : new Error(errorMessage)
    );
  }
}
