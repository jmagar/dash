import { useState, useCallback } from 'react';
import type { FileInfo } from '../../types/files';

interface ClipboardState {
  files: FileInfo[];
  operation: 'copy' | 'cut' | null;
  sourceHostId: string | null;
}

export function useFileClipboard() {
  const [clipboard, setClipboard] = useState<ClipboardState>({
    files: [],
    operation: null,
    sourceHostId: null,
  });

  const copyToClipboard = useCallback((files: FileInfo[], hostId: string) => {
    setClipboard({
      files,
      operation: 'copy',
      sourceHostId: hostId,
    });
  }, []);

  const cutToClipboard = useCallback((files: FileInfo[], hostId: string) => {
    setClipboard({
      files,
      operation: 'cut',
      sourceHostId: hostId,
    });
  }, []);

  const clearClipboard = useCallback(() => {
    setClipboard({
      files: [],
      operation: null,
      sourceHostId: null,
    });
  }, []);

  const canPaste = useCallback((currentPath: string) => {
    if (!clipboard.files.length || !clipboard.operation) {
      return false;
    }

    // Don't allow pasting into a path that contains one of the source files
    return !clipboard.files.some(file => 
      currentPath.startsWith(file.path) || file.path.startsWith(currentPath)
    );
  }, [clipboard]);

  return {
    clipboard,
    copyToClipboard,
    cutToClipboard,
    clearClipboard,
    canPaste,
  };
}
