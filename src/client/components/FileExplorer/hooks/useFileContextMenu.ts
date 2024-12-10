import { useState, useCallback } from 'react';
import type { FileInfo } from '../../../../types/files';
import type { FileContextMenuState } from '../types';

export function useFileContextMenu() {
  const [contextMenu, setContextMenu] = useState<FileContextMenuState>({
    anchorEl: null,
    file: null,
  });

  const handleContextMenu = useCallback((event: React.MouseEvent, file: FileInfo) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      anchorEl: event.currentTarget as HTMLElement,
      file,
    });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu({
      anchorEl: null,
      file: null,
    });
  }, []);

  return {
    contextMenu,
    handleContextMenu,
    handleCloseContextMenu,
  };
} 