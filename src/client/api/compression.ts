import { BaseApiClient, type Endpoint, type EndpointParams } from './base.client';
import { ApiError } from './api';
import { logger } from '../utils/frontendLogger';

interface ArchiveEntry {
  name: string;
  size: number;
  type: 'file' | 'directory';
  modifiedAt: string;
}

interface ListArchiveResponse {
  entries: ArchiveEntry[];
  totalSize: number;
  entryCount: number;
}

interface CompressionRequest {
  hostId: string;
  sourcePaths: string[];
  targetPath: string;
}

interface ExtractionRequest {
  hostId: string;
  sourcePath: string;
  targetPath: string;
}

type CompressionEndpoints = Record<string, Endpoint> & {
  COMPRESS: '/api/compression/compress';
  EXTRACT: '/api/compression/extract';
  LIST: (...args: EndpointParams[]) => string;
};

const COMPRESSION_ENDPOINTS: CompressionEndpoints = {
  COMPRESS: '/api/compression/compress',
  EXTRACT: '/api/compression/extract',
  LIST: (hostId: EndpointParams, archivePath: EndpointParams) => 
    `/api/compression/list/${encodeURIComponent(String(hostId))}/${encodeURIComponent(String(archivePath))}`,
};

class CompressionClient extends BaseApiClient<CompressionEndpoints> {
  constructor() {
    super(COMPRESSION_ENDPOINTS);
  }

  private validateInput(params: Record<string, unknown>, operation: string): void {
    const missingParams = Object.entries(params)
      .filter(([_, value]) => !value || (Array.isArray(value) && !value.length))
      .map(([key]) => key);

    if (missingParams.length > 0) {
      throw new ApiError({
        message: `Invalid ${operation} parameters: ${missingParams.join(', ')} ${missingParams.length > 1 ? 'are' : 'is'} required`,
        code: 'VALIDATION_ERROR',
        data: params
      });
    }
  }

  async compressFiles(hostId: string, sourcePaths: string[], targetPath: string): Promise<void> {
    try {
      this.validateInput(
        { hostId, sourcePaths, targetPath },
        'compression'
      );

      logger.info('Compressing files', { hostId, sourcePaths, targetPath });

      const request: CompressionRequest = {
        hostId,
        sourcePaths,
        targetPath,
      };

      const response = await this.post<void>(
        this.getEndpoint('COMPRESS'),
        request
      );

      if (!response.success) {
        throw new ApiError({
          message: response.error || 'Failed to compress files',
          code: 'COMPRESSION_ERROR',
          data: request
        });
      }
    } catch (error) {
      logger.error('Failed to compress files', {
        error: error instanceof Error ? error.message : String(error),
        hostId,
        sourcePaths,
        targetPath
      });

      throw error instanceof ApiError ? error : new ApiError({
        message: 'Failed to compress files',
        code: 'COMPRESSION_ERROR',
        data: { hostId, sourcePaths, targetPath }
      });
    }
  }

  async extractFiles(hostId: string, sourcePath: string, targetPath: string): Promise<void> {
    try {
      this.validateInput(
        { hostId, sourcePath, targetPath },
        'extraction'
      );

      logger.info('Extracting files', { hostId, sourcePath, targetPath });

      const request: ExtractionRequest = {
        hostId,
        sourcePath,
        targetPath,
      };

      const response = await this.post<void>(
        this.getEndpoint('EXTRACT'),
        request
      );

      if (!response.success) {
        throw new ApiError({
          message: response.error || 'Failed to extract files',
          code: 'EXTRACTION_ERROR',
          data: request
        });
      }
    } catch (error) {
      logger.error('Failed to extract files', {
        error: error instanceof Error ? error.message : String(error),
        hostId,
        sourcePath,
        targetPath
      });

      throw error instanceof ApiError ? error : new ApiError({
        message: 'Failed to extract files',
        code: 'EXTRACTION_ERROR',
        data: { hostId, sourcePath, targetPath }
      });
    }
  }

  async listArchiveContents(hostId: string, archivePath: string): Promise<ListArchiveResponse> {
    try {
      this.validateInput(
        { hostId, archivePath },
        'list'
      );

      logger.info('Listing archive contents', { hostId, archivePath });

      const response = await this.get<ListArchiveResponse>(
        this.getEndpoint('LIST', hostId, archivePath)
      );

      if (!response.data) {
        throw new ApiError({
          message: 'No response data received',
          code: 'LIST_ERROR',
          data: { hostId, archivePath }
        });
      }

      return response.data;
    } catch (error) {
      logger.error('Failed to list archive contents', {
        error: error instanceof Error ? error.message : String(error),
        hostId,
        archivePath
      });

      throw error instanceof ApiError ? error : new ApiError({
        message: 'Failed to list archive contents',
        code: 'LIST_ERROR',
        data: { hostId, archivePath }
      });
    }
  }
}

// Create a single instance
const compressionClient = new CompressionClient();

// Export bound methods
export const {
  compressFiles,
  extractFiles,
  listArchiveContents
} = compressionClient;

// Export types
export type {
  ArchiveEntry,
  ListArchiveResponse,
  CompressionRequest,
  ExtractionRequest
};
