import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { Injectable } from '@nestjs/common';
import { FileSystemConfigService } from './filesystem-config.service';
import { FileSystemMetricsService } from './filesystem-metrics.service';
import { PathValidationService } from './path-validator.service';
import { Logger } from '../../utils/logger';

export interface TempFileOptions {
  prefix?: string;
  suffix?: string;
  encoding?: BufferEncoding;
  maxAge?: number;
}

@Injectable()
export class TempFileService {
  constructor(
    private readonly configService: FileSystemConfigService,
    private readonly metricsService: FileSystemMetricsService,
    private readonly pathValidator: PathValidationService,
    private readonly logger: Logger
  ) {}

  /**
   * Create a temporary file
   */
  public async createTempFile(
    content: string | Buffer, 
    options: TempFileOptions = {}
  ): Promise<string> {
    try {
      // Validate and get temp path
      const tempPath = await this.pathValidator.validatePathAccess(
        'system', 
        'local', 
        this.configService.getTempPath()
      );

      // Generate unique filename
      const filename = this.generateUniqueFilename(options);
      const fullPath = path.join(tempPath, filename);

      // Write file content
      await fs.writeFile(fullPath, content, {
        encoding: options.encoding || 'utf8'
      });

      // Record metrics
      this.metricsService.recordOperation({
        operation: 'create_temp_file',
        type: 'success',
        size: Buffer.byteLength(content)
      });

      this.logger.info('Temporary file created', { 
        path: fullPath, 
        size: Buffer.byteLength(content) 
      });

      return fullPath;
    } catch (error) {
      this.handleTempFileError('create', error);
      throw error;
    }
  }

  /**
   * Read a temporary file
   */
  public async readTempFile(
    filePath: string, 
    options: { encoding?: BufferEncoding } = {}
  ): Promise<string> {
    try {
      // Validate file access
      const sanitizedPath = await this.pathValidator.validatePathAccess(
        'system', 
        'local', 
        filePath
      );

      // Read file content
      const content = await fs.readFile(sanitizedPath, {
        encoding: options.encoding || 'utf8'
      });

      // Record metrics
      this.metricsService.recordOperation({
        operation: 'read_temp_file',
        type: 'success',
        size: Buffer.byteLength(content)
      });

      return content;
    } catch (error) {
      this.handleTempFileError('read', error);
      throw error;
    }
  }

  /**
   * Delete a temporary file
   */
  public async deleteTempFile(filePath: string): Promise<void> {
    try {
      // Validate file access
      const sanitizedPath = await this.pathValidator.validatePathAccess(
        'system', 
        'local', 
        filePath
      );

      // Delete file
      await fs.unlink(sanitizedPath);

      // Record metrics
      this.metricsService.recordOperation({
        operation: 'delete_temp_file',
        type: 'success'
      });

      this.logger.info('Temporary file deleted', { path: sanitizedPath });
    } catch (error) {
      this.handleTempFileError('delete', error);
      throw error;
    }
  }

  /**
   * Clean up expired temporary files
   */
  public async cleanupExpiredTempFiles(): Promise<void> {
    try {
      const tempPath = this.configService.getTempPath();
      const maxAge = this.configService.getMaxTempFileAge();
      const now = Date.now();

      // Validate temp path
      const sanitizedPath = await this.pathValidator.validatePathAccess(
        'system', 
        'local', 
        tempPath
      );

      // Read directory contents
      const files = await fs.readdir(sanitizedPath);

      // Filter and delete expired files
      const deletePromises = files
        .filter(file => this.isFileExpired(path.join(sanitizedPath, file), maxAge, now))
        .map(file => this.deleteTempFile(path.join(sanitizedPath, file)));

      await Promise.allSettled(deletePromises);

      // Record metrics
      this.metricsService.recordOperation({
        operation: 'cleanup_temp_files',
        type: 'success'
      });

      this.logger.info('Temporary files cleanup completed', { 
        deletedFiles: deletePromises.length 
      });
    } catch (error) {
      this.handleTempFileError('cleanup', error);
    }
  }

  /**
   * Generate a unique filename
   */
  private generateUniqueFilename(options: TempFileOptions = {}): string {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(16).toString('hex');
    const prefix = options.prefix || 'temp';
    const suffix = options.suffix || '';

    return `${prefix}-${timestamp}-${randomString}${suffix}`;
  }

  /**
   * Check if a file is expired
   */
  private isFileExpired(
    filePath: string, 
    maxAge: number, 
    currentTime: number
  ): boolean {
    try {
      const stats = fs.statSync(filePath);
      return (currentTime - stats.mtime.getTime()) > maxAge;
    } catch {
      // If stat fails, consider the file as not expired
      return false;
    }
  }

  /**
   * Handle and log temp file errors
   */
  private handleTempFileError(operation: string, error: unknown): void {
    this.logger.error(`Temp file ${operation} failed`, { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });

    this.metricsService.recordError(
      `temp_file_${operation}`, 
      error instanceof Error ? 'system' : 'unknown', 
      error instanceof Error ? error : undefined
    );
  }
}
