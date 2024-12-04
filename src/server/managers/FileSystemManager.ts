import { Injectable } from '@nestjs/common';
import { BaseService } from '../services/base.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// Zod schema for robust file metadata validation
const FileMetadataSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  path: z.string().min(1),
  size: z.number().nonnegative(),
  mimeType: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
  checksum: z.string().min(1)
});

type FileMetadata = z.infer<typeof FileMetadataSchema>;

// Zod schema for configuration validation
const FileSystemConfigSchema = z.object({
  storage: z.object({
    basePath: z.string().min(1),
    tempPath: z.string().min(1),
    maxTempFileAge: z.number().positive().default(86400000), // 24 hours
    maxFileSize: z.number().positive().default(1024 * 1024 * 100), // 100MB
  })
});

// Dependency interface for explicit dependency injection
interface FileSystemManagerDependencies {
  configManager: ConfigManager;
  securityManager: SecurityManager;
}

@Injectable()
export class FileSystemManager extends BaseService {
  private static instance: FileSystemManager;
  private baseStoragePath: string;
  private tempStoragePath: string;
  private maxTempFileAge: number;
  private maxFileSize: number;
  private dependencies: FileSystemManagerDependencies;

  private constructor(dependencies: FileSystemManagerDependencies) {
    super({
      name: 'filesystem-manager',
      version: '1.0.0'
    });

    this.dependencies = dependencies;
    
    // Validate configuration
    const config = dependencies.configManager.get('fileSystem');
    const validatedConfig = FileSystemConfigSchema.parse(config);

    this.baseStoragePath = validatedConfig.storage.basePath;
    this.tempStoragePath = validatedConfig.storage.tempPath;
    this.maxTempFileAge = validatedConfig.storage.maxTempFileAge;
    this.maxFileSize = validatedConfig.storage.maxFileSize;

    this.setupMetrics();
  }

  public static getInstance(dependencies?: FileSystemManagerDependencies): FileSystemManager {
    if (!FileSystemManager.instance) {
      if (!dependencies) {
        throw new Error('Dependencies must be provided when initializing FileSystemManager');
      }
      FileSystemManager.instance = new FileSystemManager(dependencies);
    }
    return FileSystemManager.instance;
  }

  private setupMetrics(): void {
    // Enhanced metrics with more granular tracking
    this.metrics.createCounter('filesystem_operations_total', 'Total number of filesystem operations', ['operation', 'type']);
    this.metrics.createCounter('filesystem_errors_total', 'Total number of filesystem errors', ['operation', 'type']);
    this.metrics.createGauge('filesystem_storage_used_bytes', 'Storage space used in bytes');
    this.metrics.createGauge('filesystem_storage_available_bytes', 'Storage space available in bytes');
    this.metrics.createHistogram('filesystem_operation_duration_seconds', 'Duration of filesystem operations', ['operation', 'type']);
    this.metrics.createCounter('filesystem_file_size_total', 'Total file sizes processed', ['type']);
  }

  public async init(): Promise<void> {
    try {
      // Ensure storage directories exist
      await this.ensureDirectories();

      // Validate storage paths
      await this.validateStoragePaths();

      // Initialize cleanup schedule for temp files
      this.scheduleTempCleanup();

      this.logger.info('FileSystem manager initialized successfully', {
        baseStoragePath: this.baseStoragePath,
        tempStoragePath: this.tempStoragePath
      });
    } catch (error) {
      this.logger.error('Failed to initialize FileSystem manager', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined 
      });
      throw error;
    }
  }

  public async cleanup(): Promise<void> {
    try {
      // Clean up temp directory
      await this.cleanupTempFiles();

      this.logger.info('FileSystem manager cleaned up successfully');
    } catch (error) {
      this.logger.error('Error during FileSystem manager cleanup', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined 
      });
      throw error;
    }
  }

  public async getHealth(): Promise<{ status: 'healthy' | 'unhealthy' | 'degraded'; details?: Record<string, unknown>; }> {
    try {
      const [baseStats, tempStats, storageStats] = await Promise.all([
        fs.stat(this.baseStoragePath),
        fs.stat(this.tempStoragePath),
        this.getStorageStats()
      ]);

      const usagePercentage = (storageStats.used / (storageStats.used + storageStats.available)) * 100;

      return {
        status: usagePercentage > 90 ? 'degraded' : 'healthy',
        details: {
          baseStorage: {
            exists: true,
            size: baseStats.size,
            isDirectory: baseStats.isDirectory()
          },
          tempStorage: {
            exists: true,
            size: tempStats.size,
            isDirectory: tempStats.isDirectory()
          },
          storageUsage: {
            used: storageStats.used,
            available: storageStats.available,
            usagePercentage
          }
        }
      };
    } catch (error) {
      this.logger.error('FileSystem manager health check failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined 
      });
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  private async validateStoragePaths(): Promise<void> {
    try {
      const [baseStat, tempStat] = await Promise.all([
        fs.stat(this.baseStoragePath),
        fs.stat(this.tempStoragePath)
      ]);

      if (!baseStat.isDirectory() || !tempStat.isDirectory()) {
        throw new Error('Storage paths must be directories');
      }

      // Check write permissions
      const testFile = path.join(this.baseStoragePath, '.write-test');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
    } catch (error) {
      this.logger.error('Storage path validation failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined 
      });
      throw error;
    }
  }

  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.baseStoragePath, { recursive: true });
      await fs.mkdir(this.tempStoragePath, { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create storage directories', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined 
      });
      throw error;
    }
  }

  private scheduleTempCleanup(): void {
    const CLEANUP_INTERVAL = 1000 * 60 * 60; // 1 hour
    setInterval(() => this.cleanupTempFiles(), CLEANUP_INTERVAL);
  }

  private async cleanupTempFiles(): Promise<void> {
    try {
      const now = Date.now();
      const files = await fs.readdir(this.tempStoragePath);
      
      let cleanedFilesCount = 0;
      for (const file of files) {
        const filePath = path.join(this.tempStoragePath, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtimeMs > this.maxTempFileAge) {
          await fs.unlink(filePath);
          cleanedFilesCount++;
          this.logger.debug('Cleaned up temp file', { file });
        }
      }

      if (cleanedFilesCount > 0) {
        this.logger.info('Temp file cleanup completed', { cleanedCount: cleanedFilesCount });
      }
    } catch (error) {
      this.logger.error('Error cleaning up temp files', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined 
      });
      this.metrics.incrementCounter('filesystem_errors_total', { operation: 'cleanup', type: 'temp' });
    }
  }

  public async saveFile(
    sourceStream: NodeJS.ReadableStream,
    metadata: Omit<FileMetadata, 'id' | 'path' | 'createdAt' | 'updatedAt'>
  ): Promise<FileMetadata> {
    const startTime = Date.now();
    const fileId = uuidv4();
    const relativePath = this.generatePath(fileId);
    const fullPath = path.join(this.baseStoragePath, relativePath);

    try {
      // Validate file size before saving
      const sizeValidator = (stream: NodeJS.ReadableStream): Promise<number> => {
        return new Promise((resolve, reject) => {
          let totalSize = 0;
          stream.on('data', (chunk) => {
            totalSize += chunk.length;
            if (totalSize > this.maxFileSize) {
              stream.destroy();
              reject(new Error(`File size exceeds maximum limit of ${this.maxFileSize} bytes`));
            }
          });
          stream.on('end', () => resolve(totalSize));
        });
      };

      // Ensure directory exists
      await fs.mkdir(path.dirname(fullPath), { recursive: true });

      // Validate and save file
      const fileSize = await sizeValidator(sourceStream);
      await pipeline(
        sourceStream,
        createWriteStream(fullPath)
      );

      const stats = await fs.stat(fullPath);
      const fileMetadata: FileMetadata = {
        id: fileId,
        name: metadata.name,
        path: relativePath,
        size: stats.size,
        mimeType: metadata.mimeType,
        checksum: metadata.checksum,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Validate metadata
      FileMetadataSchema.parse(fileMetadata);

      this.metrics.incrementCounter('filesystem_operations_total', { operation: 'save', type: metadata.mimeType });
      this.metrics.observeHistogram(
        'filesystem_operation_duration_seconds',
        (Date.now() - startTime) / 1000,
        { operation: 'save', type: metadata.mimeType }
      );
      this.metrics.incrementCounter('filesystem_file_size_total', { type: metadata.mimeType });

      return fileMetadata;
    } catch (error) {
      this.logger.error('Error saving file', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata,
        stack: error instanceof Error ? error.stack : undefined 
      });
      this.metrics.incrementCounter('filesystem_errors_total', { operation: 'save', type: metadata.mimeType });
      throw error;
    }
  }

  public async getFile(fileId: string): Promise<NodeJS.ReadableStream> {
    const startTime = Date.now();
    const relativePath = this.generatePath(fileId);
    const fullPath = path.join(this.baseStoragePath, relativePath);

    try {
      await fs.access(fullPath);
      const stream = createReadStream(fullPath);

      this.metrics.incrementCounter('filesystem_operations_total', { operation: 'get', type: 'file' });
      this.metrics.observeHistogram(
        'filesystem_operation_duration_seconds',
        (Date.now() - startTime) / 1000,
        { operation: 'get', type: 'file' }
      );

      return stream;
    } catch (error) {
      this.logger.error('Error getting file', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        fileId,
        stack: error instanceof Error ? error.stack : undefined 
      });
      this.metrics.incrementCounter('filesystem_errors_total', { operation: 'get', type: 'file' });
      throw error;
    }
  }

  public async deleteFile(fileId: string): Promise<void> {
    const startTime = Date.now();
    const relativePath = this.generatePath(fileId);
    const fullPath = path.join(this.baseStoragePath, relativePath);

    try {
      // Validate file existence before deletion
      await fs.access(fullPath);

      await fs.unlink(fullPath);

      this.metrics.incrementCounter('filesystem_operations_total', { operation: 'delete', type: 'file' });
      this.metrics.observeHistogram(
        'filesystem_operation_duration_seconds',
        (Date.now() - startTime) / 1000,
        { operation: 'delete', type: 'file' }
      );

      this.logger.info('File deleted successfully', { fileId });
    } catch (error) {
      this.logger.error('Error deleting file', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        fileId,
        stack: error instanceof Error ? error.stack : undefined 
      });
      this.metrics.incrementCounter('filesystem_errors_total', { operation: 'delete', type: 'file' });
      throw error;
    }
  }

  public async moveFile(fileId: string, newPath: string): Promise<void> {
    const startTime = Date.now();
    const currentPath = path.join(this.baseStoragePath, this.generatePath(fileId));
    const targetPath = path.join(this.baseStoragePath, newPath);

    try {
      // Validate source and target paths
      await fs.access(currentPath);
      await fs.mkdir(path.dirname(targetPath), { recursive: true });

      await fs.rename(currentPath, targetPath);

      this.metrics.incrementCounter('filesystem_operations_total', { operation: 'move', type: 'file' });
      this.metrics.observeHistogram(
        'filesystem_operation_duration_seconds',
        (Date.now() - startTime) / 1000,
        { operation: 'move', type: 'file' }
      );

      this.logger.info('File moved successfully', { fileId, newPath });
    } catch (error) {
      this.logger.error('Error moving file', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        fileId,
        newPath,
        stack: error instanceof Error ? error.stack : undefined 
      });
      this.metrics.incrementCounter('filesystem_errors_total', { operation: 'move', type: 'file' });
      throw error;
    }
  }

  private generatePath(fileId: string): string {
    // Create a directory structure based on the file ID to avoid too many files in one directory
    const parts = fileId.match(/.{1,2}/g) || [];
    return path.join(...parts.slice(0, 3), fileId);
  }

  public async getStorageStats(): Promise<{ used: number; available: number }> {
    try {
      let totalSize = 0;
      const processDirectory = async (dirPath: string) => {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          if (entry.isDirectory()) {
            await processDirectory(fullPath);
          } else {
            const stats = await fs.stat(fullPath);
            totalSize += stats.size;
          }
        }
      };

      await processDirectory(this.baseStoragePath);
      
      // Get actual available space (requires platform-specific implementation)
      const availableSpace = await this.getAvailableDiskSpace();

      this.metrics.setGauge('filesystem_storage_used_bytes', totalSize);
      this.metrics.setGauge('filesystem_storage_available_bytes', availableSpace);

      return {
        used: totalSize,
        available: availableSpace
      };
    } catch (error) {
      this.logger.error('Error getting storage stats', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined 
      });
      throw error;
    }
  }

  // Platform-specific disk space check (simplified for demonstration)
  private async getAvailableDiskSpace(): Promise<number> {
    try {
      // This is a placeholder. In a real-world scenario, you'd use platform-specific methods
      // For Windows, you might use the `diskspace` package or `systeminformation`
      // For Unix-like systems, you might use `df` command or `statvfs`
      const TOTAL_DISK_SPACE = 1024n * 1024n * 1024n * 1024n; // 1TB
      const RESERVED_SPACE = 10n * 1024n * 1024n * 1024n; // 10GB reserved

      return Number(TOTAL_DISK_SPACE - RESERVED_SPACE);
    } catch (error) {
      this.logger.error('Error getting available disk space', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined 
      });
      
      // Fallback to a conservative estimate
      return Number.MAX_SAFE_INTEGER / 2;
    }
  }

  // Optional: Bulk file operations
  public async bulkDeleteFiles(fileIds: string[]): Promise<void> {
    const startTime = Date.now();

    try {
      const deletionPromises = fileIds.map(async (fileId) => {
        try {
          await this.deleteFile(fileId);
        } catch (error) {
          this.logger.warn('Failed to delete individual file', { 
            fileId, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
          // Continue with other deletions even if one fails
        }
      });

      await Promise.all(deletionPromises);

      this.metrics.incrementCounter('filesystem_operations_total', { operation: 'bulk_delete', type: 'files' });
      this.metrics.observeHistogram(
        'filesystem_operation_duration_seconds',
        (Date.now() - startTime) / 1000,
        { operation: 'bulk_delete', type: 'files' }
      );

      this.logger.info('Bulk file deletion completed', { fileCount: fileIds.length });
    } catch (error) {
      this.logger.error('Error in bulk file deletion', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        fileCount: fileIds.length,
        stack: error instanceof Error ? error.stack : undefined 
      });
      this.metrics.incrementCounter('filesystem_errors_total', { operation: 'bulk_delete', type: 'files' });
      throw error;
    }
  }
}
