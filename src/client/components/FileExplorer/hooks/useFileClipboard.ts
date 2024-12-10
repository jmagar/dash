import { useState, useCallback } from 'react';
import type { FileInfo } from '../../../../types/files';
import type { FileClipboardState } from '../types';

export function useFileClipboard() {
  const [clipboardState, setClipboardState] = useState<FileClipboardState>({
    files: [],
    operation: null
  });

  const copyToClipboard = useCallback((files: FileInfo[]) => {
    setClipboardState({
      files,
      operation: 'copy'
    });
  }, []);

  const cutToClipboard = useCallback((files: FileInfo[]) => {
    setClipboardState({
      files,
      operation: 'cut'
    });
  }, []);

  const clearClipboard = useCallback(() => {
    setClipboardState({
      files: [],
      operation: null
    });
  }, []);

  return {
    clipboardState,
    copyToClipboard,
    cutToClipboard,
    clearClipboard,
    canPaste: clipboardState.files.length > 0 && clipboardState.operation !== null
  };
} 