export type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export interface UploadFileParams {
  file: File;
  path: string;
  onProgress: (progress: number) => void;
}

export interface UploadFileHook {
  (): (params: UploadFileParams) => Promise<void>;
} 