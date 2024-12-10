export type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export interface UploadOptions {
  file: File;
  path: string;
  onProgress?: (progress: number) => void;
} 