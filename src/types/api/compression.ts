export type CompressionFormatValue = 'zip' | 'tar' | 'gz' | 'bz2';

export interface CompressionFormat {
  value: CompressionFormatValue;
  label: string;
  mimeType: string;
}

export interface CompressionRequest {
  hostId: string;
  sourcePaths: string[];
  targetPath: string;
}

export interface ExtractionRequest {
  hostId: string;
  sourcePath: string;
  targetPath: string;
}

export interface ListArchiveRequest {
  hostId: string;
  archivePath: string;
}

export interface ListArchiveResponse {
  contents: string[];
  totalSize: number;
  compressedSize: number;
  format: CompressionFormatValue;
}

export interface CompressionError extends Error {
  code: 'COMPRESSION_ERROR' | 'EXTRACTION_ERROR' | 'LIST_ERROR';
  details?: {
    hostId: string;
    sourcePaths?: string[];
    sourcePath?: string;
    targetPath?: string;
    archivePath?: string;
  };
}
