import { useState, useCallback } from 'react';
import type { FileInfo } from '../../../../types/files';

interface FileDialogState {
  createFolder: boolean;
  rename: boolean;
  delete: boolean;
  compress: boolean;
  extract: boolean;
  preview: boolean;
  selectedFile: FileInfo | null;
}

export function useFileDialogs() {
  const [dialogs, setDialogs] = useState<FileDialogState>({
    createFolder: false,
    rename: false,
    delete: false,
    compress: false,
    extract: false,
    preview: false,
    selectedFile: null,
  });

  const openDialog = useCallback((dialog: keyof FileDialogState, file?: FileInfo) => {
    setDialogs(prev => ({
      ...prev,
      [dialog]: true,
      selectedFile: file || null,
    }));
  }, []);

  const closeDialog = useCallback((dialog: keyof FileDialogState) => {
    setDialogs(prev => ({
      ...prev,
      [dialog]: false,
      selectedFile: null,
    }));
  }, []);

  return {
    dialogs,
    openDialog,
    closeDialog,
  };
} 