export type CompressionFormatValue = 'zip' | 'tar' | 'gz' | 'bz2';

export interface CompressionFormat {
  value: CompressionFormatValue;
  label: string;
  mimeType: string;
}

export interface ArchiveEntry {
  name: string;
  size: number;
  isDirectory: boolean;
  modifiedTime: string;
}

export interface ListArchiveResponse {
  entries: ArchiveEntry[];
}

export interface CompressionError extends Error {
  code: string;
  details?: Record<string, string | string[]>;
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
