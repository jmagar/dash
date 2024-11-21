import { api } from './api';
import { logger } from '../utils/logger';

export interface CompressionApi {
  compressFiles(hostId: string, sourcePaths: string[], targetPath: string): Promise<void>;
  extractFiles(hostId: string, sourcePath: string, targetPath: string): Promise<void>;
  listArchiveContents(hostId: string, archivePath: string): Promise<string[]>;
}

class CompressionApiClient implements CompressionApi {
  async compressFiles(hostId: string, sourcePaths: string[], targetPath: string): Promise<void> {
    try {
      logger.debug('Sending compress request', {
        hostId,
        sourcePaths,
        targetPath,
      });
      await api.post('/api/compression/compress', {
        hostId,
        sourcePaths,
        targetPath,
      });
    } catch (error) {
      logger.error('Failed to compress files:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
        sourcePaths,
        targetPath,
      });
      throw error;
    }
  }

  async extractFiles(hostId: string, sourcePath: string, targetPath: string): Promise<void> {
    try {
      logger.debug('Sending extract request', {
        hostId,
        sourcePath,
        targetPath,
      });
      await api.post('/api/compression/extract', {
        hostId,
        sourcePath,
        targetPath,
      });
    } catch (error) {
      logger.error('Failed to extract files:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
        sourcePath,
        targetPath,
      });
      throw error;
    }
  }

  async listArchiveContents(hostId: string, archivePath: string): Promise<string[]> {
    try {
      logger.debug('Listing archive contents', {
        hostId,
        archivePath,
      });
      const response = await api.get(`/api/compression/list/${hostId}/${archivePath}`);
      return response.data.contents;
    } catch (error) {
      logger.error('Failed to list archive contents:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
        archivePath,
      });
      throw error;
    }
  }
}

export const compressionApi = new CompressionApiClient();
