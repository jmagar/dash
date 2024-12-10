import { useState, useRef } from 'react';
import type { UploadOptions, UseUploadFile } from '../types/uploads';

export const useUploadFile = (): UseUploadFile => {
  const [isUploading, setIsUploading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const uploadFile = async ({ file, path, onProgress }: UploadOptions): Promise<void> => {
    try {
      setIsUploading(true);
      
      // Create a new AbortController for this upload
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', path);

      const xhr = new XMLHttpRequest();
      
      await new Promise<void>((resolve, reject) => {
        signal.addEventListener('abort', () => {
          xhr.abort();
          reject(new Error('Upload cancelled'));
        });

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            onProgress?.(percentComplete);
          }
        });

        xhr.open('POST', '/api/files/upload');
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(xhr.statusText || 'Upload failed'));
          }
        };
        
        xhr.onerror = () => {
          reject(new Error('Network error occurred'));
        };

        xhr.send(formData);
      });

    } catch (error) {
      if (error instanceof Error && error.message === 'Upload cancelled') {
        return;
      }
      throw error;
    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
    }
  };

  return {
    uploadFile,
    cancelUpload,
    isUploading,
  };
}; 