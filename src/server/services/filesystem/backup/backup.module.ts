import { Module } from '@nestjs/common';
import { BackupManager } from './backup.manager';
import { BackupStorageService } from './backup.storage';
import { BackupVersioningService } from './backup.versioning';
import { BackupValidationService } from './backup.validation';
import { FileSystemConfigService } from '../filesystem-config.service';
import { FileSystemMetricsService } from '../filesystem-metrics.service';

/**
 * Module that provides file backup functionality.
 * Handles dependency injection and configuration for:
 * - Backup management
 * - Storage operations
 * - Version control
 * - Path validation
 */
@Module({
  imports: [],
  providers: [
    BackupManager,
    BackupStorageService,
    BackupVersioningService,
    BackupValidationService,
    FileSystemConfigService,
    FileSystemMetricsService
  ],
  exports: [
    BackupManager
  ]
})
export class BackupModule {}
