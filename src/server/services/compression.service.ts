import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '../utils/logger';
import { BaseService } from './base.service';
import type { LogMetadata } from '../../types/logger';

const execAsync = promisify(exec);

export class CompressionService extends BaseService {
  async compressFiles(hostId: string, sourcePaths: string[], targetPath: string): Promise<void> {
    try {
      logger.info('Starting file compression', {
        hostId,
        sourcePaths,
        targetPath,
      });

      // Create a temporary directory for the operation
      const tempDir = `/tmp/compression-${hostId}-${Date.now()}`;
      await fs.mkdir(tempDir, { recursive: true });

      // Create a list of files to compress
      const fileList = sourcePaths.map(p => `"${p}"`).join(' ');
      
      // Determine compression type based on target extension
      const ext = path.extname(targetPath).toLowerCase();
      let command: string;

      switch (ext) {
        case '.zip':
          command = `cd "${path.dirname(sourcePaths[0])}" && zip -r "${targetPath}" ${fileList}`;
          break;
        case '.tar':
          command = `cd "${path.dirname(sourcePaths[0])}" && tar -cf "${targetPath}" ${fileList}`;
          break;
        case '.tar.gz':
        case '.tgz':
          command = `cd "${path.dirname(sourcePaths[0])}" && tar -czf "${targetPath}" ${fileList}`;
          break;
        case '.tar.bz2':
          command = `cd "${path.dirname(sourcePaths[0])}" && tar -cjf "${targetPath}" ${fileList}`;
          break;
        default:
          throw new Error('Unsupported compression format');
      }

      logger.debug('Executing compression command', {
        command,
        hostId,
        sourcePaths,
        targetPath,
      });

      const { stdout, stderr } = await execAsync(command);

      if (stderr) {
        logger.warn('Compression command produced stderr output', {
          stderr,
          hostId,
          sourcePaths,
          targetPath,
        });
      }

      logger.info('File compression completed', {
        hostId,
        sourcePaths,
        targetPath,
        stdout: stdout.trim(),
      });
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
        sourcePaths,
        targetPath,
      };
      this.handleError(error, metadata);
    } finally {
      // Cleanup temporary directory
      try {
        const tempDir = `/tmp/compression-${hostId}-${Date.now()}`;
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (error) {
        logger.warn('Failed to cleanup temporary directory', {
          error: error instanceof Error ? error.message : 'Unknown error',
          hostId,
        });
      }
    }
  }

  async extractFiles(hostId: string, sourcePath: string, targetPath: string): Promise<void> {
    try {
      logger.info('Starting file extraction', {
        hostId,
        sourcePath,
        targetPath,
      });

      // Determine extraction command based on file extension
      const ext = path.extname(sourcePath).toLowerCase();
      let command: string;

      switch (ext) {
        case '.zip':
          command = `unzip "${sourcePath}" -d "${targetPath}"`;
          break;
        case '.tar':
          command = `tar -xf "${sourcePath}" -C "${targetPath}"`;
          break;
        case '.gz':
        case '.tgz':
          command = `tar -xzf "${sourcePath}" -C "${targetPath}"`;
          break;
        case '.bz2':
          command = `tar -xjf "${sourcePath}" -C "${targetPath}"`;
          break;
        default:
          throw new Error('Unsupported archive format');
      }

      logger.debug('Executing extraction command', {
        command,
        hostId,
        sourcePath,
        targetPath,
      });

      const { stdout, stderr } = await execAsync(command);

      if (stderr) {
        logger.warn('Extraction command produced stderr output', {
          stderr,
          hostId,
          sourcePath,
          targetPath,
        });
      }

      logger.info('File extraction completed', {
        hostId,
        sourcePath,
        targetPath,
        stdout: stdout.trim(),
      });
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
        sourcePath,
        targetPath,
      };
      this.handleError(error, metadata);
    }
  }

  async listArchiveContents(hostId: string, archivePath: string): Promise<string[]> {
    try {
      logger.info('Listing archive contents', {
        hostId,
        archivePath,
      });

      // Determine list command based on file extension
      const ext = path.extname(archivePath).toLowerCase();
      let command: string;

      switch (ext) {
        case '.zip':
          command = `unzip -l "${archivePath}" | tail -n +4 | head -n -2 | awk '{$1=$2=$3=""; print substr($0,4)}'`;
          break;
        case '.tar':
          command = `tar -tf "${archivePath}"`;
          break;
        case '.gz':
        case '.tgz':
          command = `tar -tzf "${archivePath}"`;
          break;
        case '.bz2':
          command = `tar -tjf "${archivePath}"`;
          break;
        default:
          throw new Error('Unsupported archive format');
      }

      logger.debug('Executing list command', {
        command,
        hostId,
        archivePath,
      });

      const { stdout, stderr } = await execAsync(command);

      if (stderr) {
        logger.warn('List command produced stderr output', {
          stderr,
          hostId,
          archivePath,
        });
      }

      const files = stdout.trim().split('\n').filter(Boolean);

      logger.info('Archive contents listed', {
        hostId,
        archivePath,
        fileCount: files.length,
      });

      return files;
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
        archivePath,
      };
      this.handleError(error, metadata);
    }
  }
}

export const compressionService = new CompressionService();
