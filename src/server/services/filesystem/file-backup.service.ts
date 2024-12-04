import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { Injectable } from '@nestjs/common';
import { FileSystemConfigService } from './filesystem-config.service';
import { FileSystemMetricsService } from './filesystem-metrics.service';
import { PathValidationService } from './path-validator.service';
import { Logger } from '../../utils/logger';

export interface BackupOptions {
  maxVersions?: number;
  backupPath?: string;
  includeMetadata?: boolean;
}

export interface FileVersion {
  path: string;
  timestamp: number;
  hash: string;
  size: number;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class FileBackupService {
  private readonly DEFAULT_MAX_VERSIONS = 5;
  private readonly BACKUP_SUFFIX = '.backup';

  constructor(
    private readonly configService: FileSystemConfigService,
    private readonly metricsService: FileSystemMetricsService,
    private readonly pathValidator: PathValidationService,
    private readonly logger: Logger
  ) {}

  /**
   * Create a backup of a file
   */
  public async createBackup(
    filePath: string, 
    options: BackupOptions = {}
  ): Promise<FileVersion> {
    try {
      // Validate source file path
      const sanitizedSourcePath = await this.pathValidator.validatePathAccess(
        'system', 
        'local', 
        filePath
      );

      // Get or create backup directory
      const backupDir = await this.getBackupDirectory(options.backupPath);

      // Generate backup filename
      const backupFilename = this.generateBackupFilename(filePath);
      const backupPath = path.join(backupDir, backupFilename);

      // Read source file
      const fileContent = await fs.readFile(sanitizedSourcePath);
      
      // Write backup file
      await fs.writeFile(backupPath, fileContent);

      // Get file stats and hash
      const stats = await fs.stat(sanitizedSourcePath);
      const hash = await this.calculateFileHash(fileContent);

      // Create version metadata
      const version: FileVersion = {
        path: backupPath,
        timestamp: Date.now(),
        hash,
        size: stats.size,
        metadata: options.includeMetadata 
          ? await this.extractFileMetadata(sanitizedSourcePath) 
          : undefined
      };

      // Manage version history
      await this.manageVersionHistory(filePath, options.maxVersions);

      // Record metrics
      this.metricsService.recordOperation({
        operation: 'create_backup',
        type: 'success',
        size: stats.size
      });

      this.logger.info('File backup created', { 
        sourcePath: filePath, 
        backupPath 
      });

      return version;
    } catch (error) {
      this.handleBackupError('create', error);
      throw error;
    }
  }

  /**
   * Restore a file from a backup
   */
  public async restoreFromBackup(
    backupPath: string, 
    targetPath?: string
  ): Promise<void> {
    try {
      // Validate backup file path
      const sanitizedBackupPath = await this.pathValidator.validatePathAccess(
        'system', 
        'local', 
        backupPath
      );

      // Use original path if no target specified
      const restorePath = targetPath || this.getOriginalPathFromBackup(backupPath);

      // Validate restore path
      await this.pathValidator.validatePathAccess(
        'system', 
        'local', 
        restorePath
      );

      // Read backup content
      const backupContent = await fs.readFile(sanitizedBackupPath);

      // Write to original or specified path
      await fs.writeFile(restorePath, backupContent);

      // Record metrics
      this.metricsService.recordOperation({
        operation: 'restore_backup',
        type: 'success',
        size: backupContent.length
      });

      this.logger.info('File restored from backup', { 
        backupPath, 
        restorePath 
      });
    } catch (error) {
      this.handleBackupError('restore', error);
      throw error;
    }
  }

  /**
   * List backup versions for a file
   */
  public async listBackupVersions(
    filePath: string
  ): Promise<FileVersion[]> {
    try {
      // Validate source file path
      await this.pathValidator.validatePathAccess(
        'system', 
        'local', 
        filePath
      );

      // Get backup directory
      const backupDir = await this.getBackupDirectory();

      // Find backup files for this path
      const backupFiles = await fs.readdir(backupDir)
        .then(files => files.filter(file => 
          file.startsWith(this.getBackupPrefix(filePath))
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
            hash: await this.calculateFileHash(content),
            size: stats.size
          };
        })
      );

      // Sort versions by timestamp (newest first)
      return versions.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      this.handleBackupError('list_versions', error);
      throw error;
    }
  }

  /**
   * Manage backup version history
   */
  private async manageVersionHistory(
    filePath: string, 
    maxVersions?: number
  ): Promise<void> {
    const limit = maxVersions || this.DEFAULT_MAX_VERSIONS;
    
    try {
      // Get backup directory
      const backupDir = await this.getBackupDirectory();

      // Find backup files for this path
      const backupFiles = await fs.readdir(backupDir)
        .then(files => files.filter(file => 
          file.startsWith(this.getBackupPrefix(filePath))
        ));

      // Sort backup files by timestamp
      const sortedBackups = await Promise.all(
        backupFiles.map(async (file) => {
          const fullPath = path.join(backupDir, file);
          const stats = await fs.stat(fullPath);
          return { file, timestamp: stats.mtime.getTime() };
        })
      ).then(files => files.sort((a, b) => a.timestamp - b.timestamp));

      // Delete oldest backups if exceeding limit
      const backupsToDelete = sortedBackups.slice(0, Math.max(0, sortedBackups.length - limit));
      
      await Promise.all(
        backupsToDelete.map(backup => 
          fs.unlink(path.join(backupDir, backup.file))
        )
      );
    } catch (error) {
      this.logger.warn('Failed to manage backup versions', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Get or create backup directory
   */
  private async getBackupDirectory(
    customPath?: string
  ): Promise<string> {
    const backupPath = customPath || 
      path.join(this.configService.getBasePath(), 'backups');

    try {
      // Ensure backup directory exists
      await fs.mkdir(backupPath, { recursive: true });
      return backupPath;
    } catch (error) {
      this.logger.error('Failed to create backup directory', { 
        path: backupPath,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  /**
   * Generate backup filename
   */
  private generateBackupFilename(filePath: string): string {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    return `${this.getBackupPrefix(filePath)}-${timestamp}-${randomString}${this.BACKUP_SUFFIX}`;
  }

  /**
   * Get backup filename prefix
   */
  private getBackupPrefix(filePath: string): string {
    const basename = path.basename(filePath);
    const dirname = path.dirname(filePath);
    const sanitizedDirname = dirname.replace(/[^a-zA-Z0-9]/g, '_');
    return `${sanitizedDirname}_${basename}`;
  }

  /**
   * Get original path from backup filename
   */
  private getOriginalPathFromBackup(backupPath: string): string {
    const filename = path.basename(backupPath);
    const parts = filename.split('-');
    const originalName = parts[0].replace(/_/g, path.sep);
    return originalName.replace(this.BACKUP_SUFFIX, '');
  }

  /**
   * Calculate file hash
   */
  private async calculateFileHash(
    content: Buffer
  ): Promise<string> {
    const hash = crypto.createHash('sha256');
    hash.update(content);
    return hash.digest('hex');
  }

  /**
   * Extract file metadata
   */
  private async extractFileMetadata(
    filePath: string
  ): Promise<Record<string, unknown>> {
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

  /**
   * Handle and log backup errors
   */
  private handleBackupError(operation: string, error: unknown): void {
    this.logger.error(`Backup ${operation} failed`, { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });

    this.metricsService.recordError(
      `backup_${operation}`, 
      error instanceof Error ? 'system' : 'unknown', 
      error instanceof Error ? error : undefined
    );
  }
}
