import type {
  CompressionRequest,
  ExtractionRequest,
  ListArchiveResponse,
  CompressionError,
} from '../../types/api/compression';

interface ErrorResponse {
  message: string;
  code: string;
  details?: Record<string, string | string[]>;
}

class CompressionClient {
  private readonly baseUrl = '/api/compression';

  private async handleErrorResponse(response: Response): Promise<never> {
    const errorData = (await response.json()) as ErrorResponse;
    const error = new Error(errorData.message) as CompressionError;
    error.code = errorData.code;
    error.details = errorData.details;
    throw error;
  }

  async compressFiles(
    hostId: string,
    sourcePaths: string[],
    targetPath: string
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/compress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hostId,
        sourcePaths,
        targetPath,
      } as CompressionRequest),
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }
  }

  async extractFiles(
    hostId: string,
    sourcePath: string,
    targetPath: string
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hostId,
        sourcePath,
        targetPath,
      } as ExtractionRequest),
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }
  }

  async listArchiveContents(
    hostId: string,
    archivePath: string
  ): Promise<ListArchiveResponse> {
    const response = await fetch(
      `${this.baseUrl}/list?hostId=${encodeURIComponent(
        hostId
      )}&archivePath=${encodeURIComponent(archivePath)}`
    );

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    return response.json() as Promise<ListArchiveResponse>;
  }
}

// Create a single instance
const compressionClient = new CompressionClient();

// Export bound methods
export const compressionApi = {
  compressFiles: compressionClient.compressFiles.bind(compressionClient),
  extractFiles: compressionClient.extractFiles.bind(compressionClient),
  listArchiveContents: compressionClient.listArchiveContents.bind(compressionClient),
};

// Export types
export type {
  ArchiveEntry,
  ListArchiveResponse,
  CompressionRequest,
  ExtractionRequest,
} from '../../types/api/compression';
