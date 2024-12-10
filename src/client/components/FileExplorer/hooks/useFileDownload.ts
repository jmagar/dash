import { useCallback } from 'react';
import { useErrorHandler } from '../../../hooks/useErrorHandler';
import { useNotification } from '../../../hooks/useNotification';
import type { FileInfo } from '../../../../types/files';

export function useFileDownload() {
  const { handleError } = useErrorHandler();
  const { showNotification } = useNotification();

  const downloadFile = useCallback(async (file: FileInfo) => {
    try {
      // Create a temporary anchor element
      const link = document.createElement('a');
      
      // Set the download URL using the file's path
      // Note: This assumes your API endpoint follows this pattern
      link.href = `/api/files/download?path=${encodeURIComponent(file.path)}`;
      
      // Set the download filename
      link.download = file.name;
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showNotification('Download started', 'success');
    } catch (err) {
      handleError(err);
      throw err;
    }
  }, [handleError, showNotification]);

  const downloadMultiple = useCallback(async (files: FileInfo[]) => {
    try {
      if (files.length === 1) {
        await downloadFile(files[0]);
        return;
      }

      // For multiple files, we'll need to create a zip archive first
      const response = await fetch('/api/files/download-multiple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paths: files.map(f => f.path)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to download files');
      }

      // Get the blob from the response
      const blob = await response.blob();
      
      // Create object URL
      const url = window.URL.createObjectURL(blob);
      
      // Create temporary link
      const link = document.createElement('a');
      link.href = url;
      link.download = 'files.zip';
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      window.URL.revokeObjectURL(url);
      
      showNotification('Download started', 'success');
    } catch (err) {
      handleError(err);
      throw err;
    }
  }, [downloadFile, handleError, showNotification]);

  return {
    downloadFile,
    downloadMultiple
  };
} 