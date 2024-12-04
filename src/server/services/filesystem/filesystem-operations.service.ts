import * as fs from 'fs/promises';
import * as path from 'path';
import { Injectable } from '@nestjs/common';
import { FileSystemEntryDto } from '../../routes/filesystem/dto/filesystem-entry.dto';
import { FileSystemStatsDto } from '../../routes/filesystem/dto/filesystem-stats.dto';
import { FileType } from '../../routes/filesystem/dto/metadata.dto';
import { PathValidationService } from './path-validator.service';
import { Logger } from '../../utils/logger';
import { MetricsService } from '../../utils/metrics';

type FileOperationType = 
  | 'list_directory'
  | 'get_stats'
  | 'create_directory'
  | 'delete'
  | 'move'
  | 'write_file'
  | 'read_file';

type OperationResultType = 'success' | 'error' | 'warning';

@Injectable()
export class FileSystemOperationsService {
  constructor(
    private readonly pathValidator: PathValidationService,
    private readonly logger: Logger,
    private readonly metrics: MetricsService
  ) {}

  /**
   * List directory contents
   */
  public async listDirectory(
    userId: string, 
    hostId: string, 
    inputPath: string
  ): Promise<FileSystemEntryDto[]> {
    const operation: FileOperationType = 'list_directory';
    try {
      // Validate and sanitize path
      const sanitizedPath = await this.pathValidator.validatePathAccess(userId, hostId, inputPath);

      // Read directory entries
      const entries = await fs.readdir(sanitizedPath, { withFileTypes: true });

      // Convert entries to DTOs
      const entriesDtos = await Promise.all(
        entries.map(async (entry): Promise<FileSystemEntryDto> => 
          this.convertToEntryDto(entry, sanitizedPath)
        )
      );

      // Track metrics
      this.trackMetrics(operation, 'success');

      return entriesDtos;
    } catch (error: unknown) {
      this.handleError(operation, error);
      throw error;
    }
  }

  /**
   * Get file/directory stats
   */
  public async getStats(
    userId: string, 
    hostId: string, 
    inputPath: string
  ): Promise<FileSystemStatsDto> {
    const operation: FileOperationType = 'get_stats';
    try {
      // Validate and sanitize path
      const sanitizedPath = await this.pathValidator.validatePathAccess(userId, hostId, inputPath);

      // Get file stats
      const stats = await fs.stat(sanitizedPath);

      // Track metrics
      this.trackMetrics(operation, 'success');

      return this.convertToStatsDto(stats);
    } catch (error: unknown) {
      this.handleError(operation, error);
      throw error;
    }
  }

  /**
   * Create a directory
   */
  public async createDirectory(
    userId: string, 
    hostId: string, 
    inputPath: string, 
    recursive = false
  ): Promise<void> {
    const operation: FileOperationType = 'create_directory';
    try {
      // Validate and sanitize path
      const sanitizedPath = await this.pathValidator.validatePathAccess(userId, hostId, inputPath);

      // Create directory
      await fs.mkdir(sanitizedPath, { recursive });

      // Track metrics
      this.trackMetrics(operation, 'success');
    } catch (error: unknown) {
      this.handleError(operation, error);
      throw error;
    }
  }

  /**
   * Delete a file or directory
   */
  public async delete(
    userId: string, 
    hostId: string, 
    inputPath: string
  ): Promise<void> {
    const operation: FileOperationType = 'delete';
    try {
      // Validate and sanitize path
      const sanitizedPath = await this.pathValidator.validatePathAccess(userId, hostId, inputPath);

      // Get file stats to determine deletion method
      const stats = await fs.stat(sanitizedPath);

      // Delete file or directory
      if (stats.isDirectory()) {
        await fs.rm(sanitizedPath, { recursive: true, force: true });
      } else {
        await fs.unlink(sanitizedPath);
      }

      // Track metrics
      this.trackMetrics(operation, 'success');
    } catch (error: unknown) {
      this.handleError(operation, error);
      throw error;
    }
  }

  /**
   * Move or rename a file/directory
   */
  public async move(
    userId: string, 
    hostId: string, 
    sourcePath: string, 
    destinationPath: string
  ): Promise<void> {
    const operation: FileOperationType = 'move';
    try {
      // Validate both source and destination paths
      const sanitizedSourcePath = await this.pathValidator.validatePathAccess(userId, hostId, sourcePath);
      const sanitizedDestinationPath = await this.pathValidator.validatePathAccess(userId, hostId, destinationPath);

      // Move/rename file or directory
      await fs.rename(sanitizedSourcePath, sanitizedDestinationPath);

      // Track metrics
      this.trackMetrics(operation, 'success');
    } catch (error: unknown) {
      this.handleError(operation, error);
      throw error;
    }
  }

  /**
   * Write file contents
   */
  public async writeFile(
    userId: string, 
    hostId: string, 
    inputPath: string, 
    content: string | Buffer, 
    encoding: BufferEncoding = 'utf8'
  ): Promise<void> {
    const operation: FileOperationType = 'write_file';
    try {
      // Validate and sanitize path
      const sanitizedPath = await this.pathValidator.validatePathAccess(userId, hostId, inputPath);

      // Write file
      await fs.writeFile(sanitizedPath, content, { encoding });

      // Track metrics
      this.trackMetrics(operation, 'success');
    } catch (error: unknown) {
      this.handleError(operation, error);
      throw error;
    }
  }

  /**
   * Read file contents
   */
  public async readFile(
    userId: string, 
    hostId: string, 
    inputPath: string, 
    encoding: BufferEncoding = 'utf8'
  ): Promise<string> {
    const operation: FileOperationType = 'read_file';
    try {
      // Validate and sanitize path
      const sanitizedPath = await this.pathValidator.validatePathAccess(userId, hostId, inputPath);

      // Read file
      const content = await fs.readFile(sanitizedPath, { encoding });

      // Track metrics
      this.trackMetrics(operation, 'success');

      return content;
    } catch (error: unknown) {
      this.handleError(operation, error);
      throw error;
    }
  }

  /**
   * Convert filesystem stats to DTO
   */
  private convertToStatsDto(stats: fs.Stats): FileSystemStatsDto {
    return {
      size: stats.size,
      atime: stats.atime,
      mtime: stats.mtime,
      ctime: stats.ctime,
      birthtime: stats.birthtime,
      mode: stats.mode.toString(8)
    };
  }

  /**
   * Convert filesystem entry to DTO
   */
  private async convertToEntryDto(
    entry: fs.Dirent, 
    relativePath: string
  ): Promise<FileSystemEntryDto> {
    const fullPath = path.join(relativePath, entry.name);
    const stats = await fs.stat(fullPath);

    return {
      name: entry.name,
      type: this.determineFileType(entry),
      isDirectory: entry.isDirectory(),
      isFile: entry.isFile(),
      isSymbolicLink: entry.isSymbolicLink(),
      size: stats.size.toString(),
      modifiedTime: stats.mtime.toISOString(),
      creationTime: stats.birthtime.toISOString(),
      accessTime: stats.atime.toISOString(),
      mode: stats.mode.toString(8)
    };
  }

  /**
   * Determine file type
   */
  private determineFileType(entry: fs.Dirent): FileType {
    if (entry.isDirectory()) return FileType.DIRECTORY;
    if (entry.isFile()) return FileType.FILE;
    if (entry.isSymbolicLink()) return FileType.SYMLINK;
    return FileType.UNKNOWN;
  }

  /**
   * Track operation metrics
   */
  private trackMetrics(
    operation: FileOperationType, 
    type: OperationResultType
  ): void {
    try {
      this.metrics.counter('filesystem_operations_total')?.inc({ 
        operation, 
        type 
      });
    } catch (error: unknown) {
      this.logger.warn('Failed to track metrics', { 
        operation, 
        type, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Handle and log errors
   */
  private handleError(
    operation: FileOperationType, 
    error: unknown
  ): void {
    // Log the error with detailed context
    this.logger.error(`Failed to perform ${operation}`, { 
      error: error instanceof Error ? error.message : 'Unknown error',
      operation,
      errorStack: error instanceof Error ? error.stack : undefined
    });

    try {
      // Track error metrics
      this.metrics.counter('filesystem_errors_total')?.inc({ 
        operation, 
        type: error instanceof Error ? 'system' : 'unknown' 
      });
    } catch (metricsError: unknown) {
      // Fallback error logging for metrics tracking failure
      this.logger.warn('Failed to track error metrics', { 
        operation,
        metricsError: metricsError instanceof Error ? metricsError.message : 'Unknown error' 
      });
    }
  }
}
