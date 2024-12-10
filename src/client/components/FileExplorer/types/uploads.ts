export type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export interface UploadOptions {
  file: File;
  path: string;
  onProgress?: (progress: number) => void;
}

export interface UploadResponse {
  message: string;
  file: {
    filename: string;
    path: string;
    size: number;
  };
}

export interface UseUploadFile {
  uploadFile: (options: UploadOptions) => Promise<void>;
  cancelUpload: () => void;
  isUploading: boolean;
} 