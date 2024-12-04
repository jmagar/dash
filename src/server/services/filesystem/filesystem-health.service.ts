import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { Injectable } from '@nestjs/common';
import { FileSystemConfigService } from './filesystem-config.service';
import { FileSystemMetricsService } from './filesystem-metrics.service';
import { Logger } from '../../utils/logger';

export interface FileSystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  baseStorage: {
    path: string;
    exists: boolean;
    usable: boolean;
    freeSpace: number;
    totalSpace: number;
  };
  tempStorage: {
    path: string;
    exists: boolean;
    usable: boolean;
    freeSpace: number;
  };
  details?: Record<string, unknown>;
}

@Injectable()
export class FileSystemHealthService {
  constructor(
    private readonly configService: FileSystemConfigService,
    private readonly metricsService: FileSystemMetricsService,
    private readonly logger: Logger
  ) {}

  /**
   * Perform comprehensive filesystem health check
   */
  public async checkHealth(): Promise<FileSystemHealth> {
    try {
      const basePath = this.configService.getBasePath();
      const tempPath = this.configService.getTempPath();

      // Check base and temp storage paths
      const [baseStorageHealth, tempStorageHealth] = await Promise.all([
        this.checkStoragePathHealth(basePath),
        this.checkStoragePathHealth(tempPath)
      ]);

      // Determine overall system health
      const overallStatus = this.determineOverallHealth(
        baseStorageHealth.usable, 
        baseStorageHealth.freeSpacePercentage
      );

      // Track storage metrics
      this.metricsService.trackStorageUsage(
        baseStorageHealth.totalSpace - baseStorageHealth.freeSpace,
        baseStorageHealth.freeSpace
      );

      // Construct health report
      const healthReport: FileSystemHealth = {
        status: overallStatus,
        baseStorage: {
          path: basePath,
          exists: baseStorageHealth.exists,
          usable: baseStorageHealth.usable,
          freeSpace: baseStorageHealth.freeSpace,
          totalSpace: baseStorageHealth.totalSpace
        },
        tempStorage: {
          path: tempPath,
          exists: tempStorageHealth.exists,
          usable: tempStorageHealth.usable,
          freeSpace: tempStorageHealth.freeSpace
        }
      };

      this.logger.info('Filesystem health check completed', { 
        status: overallStatus 
      });

      return healthReport;
    } catch (error) {
      this.logger.error('Filesystem health check failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      return {
        status: 'unhealthy',
        baseStorage: {
          path: this.configService.getBasePath(),
          exists: false,
          usable: false,
          freeSpace: 0,
          totalSpace: 0
        },
        tempStorage: {
          path: this.configService.getTempPath(),
          exists: false,
          usable: false,
          freeSpace: 0
        },
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Check health of a specific storage path
   */
  private async checkStoragePathHealth(storagePath: string): Promise<{
    exists: boolean;
    usable: boolean;
    freeSpace: number;
    totalSpace: number;
    freeSpacePercentage: number;
  }> {
    try {
      // Check path existence
      let stats: fs.Stats;
      try {
        stats = await fs.stat(storagePath);
      } catch {
        return {
          exists: false,
          usable: false,
          freeSpace: 0,
          totalSpace: 0,
          freeSpacePercentage: 0
        };
      }

      // Verify it's a directory
      if (!stats.isDirectory()) {
        throw new Error('Path is not a directory');
      }

      // Check disk space
      const diskSpace = await this.getDiskSpace(storagePath);

      // Check write permissions
      await this.checkWritePermissions(storagePath);

      return {
        exists: true,
        usable: true,
        freeSpace: diskSpace.free,
        totalSpace: diskSpace.total,
        freeSpacePercentage: (diskSpace.free / diskSpace.total) * 100
      };
    } catch (error) {
      this.logger.warn('Storage path health check failed', { 
        path: storagePath,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      return {
        exists: true,
        usable: false,
        freeSpace: 0,
        totalSpace: 0,
        freeSpacePercentage: 0
      };
    }
  }

  /**
   * Get disk space information
   */
  private async getDiskSpace(storagePath: string): Promise<{
    total: number;
    free: number;
  }> {
    try {
      const drive = path.parse(storagePath).root;
      const diskInfo = await fs.statfs(drive);

      return {
        total: diskInfo.blocks * diskInfo.bsize,
        free: diskInfo.bfree * diskInfo.bsize
      };
    } catch {
      // Fallback to OS-level disk space if specific method fails
      return {
        total: os.totalmem(),
        free: os.freemem()
      };
    }
  }

  /**
   * Check write permissions for a path
   */
  private async checkWritePermissions(storagePath: string): Promise<void> {
    const testFile = path.join(storagePath, '.write-test');
    try {
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
    } catch (error) {
      throw new Error('No write permissions');
    }
  }

  /**
   * Determine overall system health
   */
  private determineOverallHealth(
    isUsable: boolean, 
    freeSpacePercentage: number
  ): FileSystemHealth['status'] {
    if (!isUsable) return 'unhealthy';
    if (freeSpacePercentage < 10) return 'degraded';
    return 'healthy';
  }
}
