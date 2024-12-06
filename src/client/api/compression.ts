import { api } from './api';
import { logger } from '../utils/frontendLogger';

// Basic types until we create proper shared DTOs
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

type CompressionErrorCode = 
  | 'COMPRESSION_ERROR'
  | 'EXTRACTION_ERROR'
  | 'LIST_ERROR'
  | 'VALIDATION_ERROR';

interface CompressionError {
  code: CompressionErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export interface CompressionApi {
  compressFiles(hostId: string, sourcePaths: string[], targetPath: string): Promise<void>;
  extractFiles(hostId: string, sourcePath: string, targetPath: string): Promise<void>;
  listArchiveContents(hostId: string, archivePath: string): Promise<ListArchiveResponse>;
}

class CompressionApiError extends Error implements CompressionError {
  constructor(
    message: string,
    public code: CompressionErrorCode,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'CompressionApiError';
    Object.setPrototypeOf(this, CompressionApiError.prototype);
  }

  static fromError(error: unknown, code: CompressionErrorCode, details: Record<string, unknown>): CompressionApiError {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new CompressionApiError(`Operation failed: ${message}`, code, details);
  }
}

class CompressionApiClient implements CompressionApi {
  private validateInput(params: Record<string, unknown>, operation: string): void {
    const missingParams = Object.entries(params)
      .filter(([_, value]) => !value || (Array.isArray(value) && !value.length))
      .map(([key]) => key);

    if (missingParams.length > 0) {
      throw new CompressionApiError(
        `Invalid ${operation} parameters: ${missingParams.join(', ')} ${missingParams.length > 1 ? 'are' : 'is'} required`,
        'VALIDATION_ERROR',
        params
      );
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

      await api.post<void>('/api/compression/compress', request);
    } catch (error) {
      logger.error('Failed to compress files', {
        error: error instanceof Error ? error.message : String(error),
        hostId,
        sourcePaths,
        targetPath
      });

      throw CompressionApiError.fromError(error, 'COMPRESSION_ERROR', {
        hostId,
        sourcePaths,
        targetPath,
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

      await api.post<void>('/api/compression/extract', request);
    } catch (error) {
      logger.error('Failed to extract files', {
        error: error instanceof Error ? error.message : String(error),
        hostId,
        sourcePath,
        targetPath
      });

      throw CompressionApiError.fromError(error, 'EXTRACTION_ERROR', {
        hostId,
        sourcePath,
        targetPath,
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

      const response = await api.get<ListArchiveResponse>(
        `/api/compression/list/${encodeURIComponent(hostId)}/${encodeURIComponent(archivePath)}`
      );

      if (!response.data) {
        throw new Error('No response data received');
      }

      return response.data;
    } catch (error) {
      logger.error('Failed to list archive contents', {
        error: error instanceof Error ? error.message : String(error),
        hostId,
        archivePath
      });

      throw CompressionApiError.fromError(error, 'LIST_ERROR', {
        hostId,
        archivePath,
      });
    }
  }
}

export const compressionApi = new CompressionApiClient();

export type {
  CompressionRequest,
  ExtractionRequest,
  ListArchiveResponse,
  CompressionError,
  CompressionErrorCode,
  ArchiveEntry
};
