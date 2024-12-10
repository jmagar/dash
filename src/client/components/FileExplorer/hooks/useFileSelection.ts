import { useState, useCallback } from 'react';
import type { FileInfo } from '../../../../types/files';
import type { FileSelectionState } from '../types';

interface UseFileSelectionOptions {
  files: FileInfo[];
}

interface FileSelectionActions {
  selectFile: (file: FileInfo, multiple?: boolean) => void;
  deselectFile: (file: FileInfo) => void;
  selectAll: () => void;
  deselectAll: () => void;
  toggleSelection: (file: FileInfo) => void;
}

export function useFileSelection({ files }: UseFileSelectionOptions) {
  const [state, setState] = useState<FileSelectionState>({
    selectedFiles: [],
    lastSelected: null,
  });

  const selectFile = useCallback((file: FileInfo, multiple = false) => {
    setState(prev => ({
      selectedFiles: multiple ? [...prev.selectedFiles, file] : [file],
      lastSelected: file,
    }));
  }, []);

  const deselectFile = useCallback((file: FileInfo) => {
    setState(prev => ({
      selectedFiles: prev.selectedFiles.filter(f => f.path !== file.path),
      lastSelected: prev.lastSelected?.path === file.path ? null : prev.lastSelected,
    }));
  }, []);

  const selectAll = useCallback(() => {
    setState({
      selectedFiles: [...files],
      lastSelected: null,
    });
  }, [files]);

  const deselectAll = useCallback(() => {
    setState({
      selectedFiles: [],
      lastSelected: null,
    });
  }, []);

  const toggleSelection = useCallback((file: FileInfo) => {
    setState(prev => {
      const isSelected = prev.selectedFiles.some(f => f.path === file.path);
      return {
        selectedFiles: isSelected
          ? prev.selectedFiles.filter(f => f.path !== file.path)
          : [...prev.selectedFiles, file],
        lastSelected: file,
      };
    });
  }, []);

  const actions: FileSelectionActions = {
    selectFile,
    deselectFile,
    selectAll,
    deselectAll,
    toggleSelection,
  };

  return {
    state,
    actions,
  };
} 