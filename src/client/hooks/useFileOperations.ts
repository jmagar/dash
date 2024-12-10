import { useCallback, useEffect } from 'react';
import type { FileInfo } from '../../types/files';

interface UseFileOperationsProps {
  selectedFiles: FileInfo[];
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onSelectAll: () => void;
}

export function useFileOperations({
  selectedFiles,
  onCopy,
  onCut,
  onPaste,
  onDelete,
  onSelectAll,
}: UseFileOperationsProps) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't handle shortcuts if user is typing in an input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      // Handle keyboard shortcuts
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'c':
            event.preventDefault();
            if (selectedFiles.length > 0) {
              onCopy();
            }
            break;
          case 'x':
            event.preventDefault();
            if (selectedFiles.length > 0) {
              onCut();
            }
            break;
          case 'v':
            event.preventDefault();
            onPaste();
            break;
          case 'a':
            event.preventDefault();
            onSelectAll();
            break;
        }
      } else if (event.key === 'Delete' && selectedFiles.length > 0) {
        event.preventDefault();
        onDelete();
      }
    },
    [selectedFiles, onCopy, onCut, onPaste, onDelete, onSelectAll]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Return any additional utility functions if needed
  return {
    // Example: function to check if files can be pasted
    canPaste: useCallback(() => {
      // This would need to be implemented based on your clipboard state management
      return true;
    }, []),
  };
}
