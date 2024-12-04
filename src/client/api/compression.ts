import { api } from './api';
import { frontendLogger } from '../utils/frontendLogger';
import type {
import { LoggingManager } from '../../server/utils/logging/LoggingManager';
  CompressionRequest,
  ExtractionRequest,
  ListArchiveRequest,
  ListArchiveResponse,
  CompressionError,
} from '../../types/api/compression';

export interface CompressionApi {
  compressFiles(hostId: string, sourcePaths: string[], targetPath: string): Promise<void>;
  extractFiles(hostId: string, sourcePath: string, targetPath: string): Promise<void>;
  listArchiveContents(hostId: string, archivePath: string): Promise<ListArchiveResponse>;
}

class CompressionApiError extends Error implements CompressionError {
  constructor(
    message: string,
    public code: CompressionError['code'],
    public details?: CompressionError['details']
  ) {
    super(message);
    this.name = 'CompressionApiError';
    Object.setPrototypeOf(this, CompressionApiError.prototype);
  }

  static fromError(error: unknown, code: CompressionError['code'], details: CompressionError['details']): CompressionApiError {
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
        `${operation.toUpperCase()}_ERROR` as CompressionError['code'],
        params as CompressionError['details']
      );
    }
  }

  async compressFiles(hostId: string, sourcePaths: string[], targetPath: string): Promise<void> {
    try {
      this.validateInput(
        { hostId, sourcePaths, targetPath },
        'compression'
      );

      frontendLoggerLoggingManager.getInstance().();

      const request: CompressionRequest = {
        hostId,
        sourcePaths,
        targetPath,
      };

      await api.post<void>('/api/compression/compress', request);
    } catch (error) {
      frontendLoggerLoggingManager.getInstance().();

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

      frontendLoggerLoggingManager.getInstance().();

      const request: ExtractionRequest = {
        hostId,
        sourcePath,
        targetPath,
      };

      await api.post<void>('/api/compression/extract', request);
    } catch (error) {
      frontendLoggerLoggingManager.getInstance().();

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

      frontendLoggerLoggingManager.getInstance().();

      const response = await api.get<ListArchiveResponse>(
        `/api/compression/list/${encodeURIComponent(hostId)}/${encodeURIComponent(archivePath)}`
      );

      return response.data;
    } catch (error) {
      frontendLoggerLoggingManager.getInstance().();

      throw CompressionApiError.fromError(error, 'LIST_ERROR', {
        hostId,
        archivePath,
      });
    }
  }
}

export const compressionApi = new CompressionApiClient();

