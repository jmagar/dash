import React, { useCallback } from 'react';
import { Box, Grid } from '@mui/material';
import { VirtualizedList } from '../../../common/VirtualizedList';
import { FileListItem } from './FileListItem';
import { FileGridItem } from './FileGridItem';
import type { FileInfo } from '../../../../../types/files';

interface FileListProps {
  files: FileInfo[];
  selectedFiles: FileInfo[];
  viewMode: 'list' | 'grid';
  onSelect: (file: FileInfo, multiSelect: boolean, rangeSelect: boolean) => void;
  onContextMenu: (event: React.MouseEvent, file: FileInfo) => void;
  onMoreClick: (event: React.MouseEvent, file: FileInfo) => void;
  onDoubleClick?: (file: FileInfo) => void;
}

const ITEM_HEIGHT = 48; // Height of list items
const GRID_COLUMNS = 4; // Number of columns in grid view
const GRID_SPACING = 2;

export function FileList({
  files,
  selectedFiles,
  viewMode,
  onSelect,
  onContextMenu,
  onMoreClick,
  onDoubleClick
}: FileListProps) {
  const isSelected = useCallback((file: FileInfo) => {
    return selectedFiles.some(selected => selected.path === file.path);
  }, [selectedFiles]);

  const handleSelect = useCallback((file: FileInfo, event: React.MouseEvent) => {
    const multiSelect = event.ctrlKey || event.metaKey;
    const rangeSelect = event.shiftKey;
    onSelect(file, multiSelect, rangeSelect);
  }, [onSelect]);

  const handleDoubleClick = useCallback((file: FileInfo) => {
    onDoubleClick?.(file);
  }, [onDoubleClick]);

  const renderListItem = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const file = files[index];
    return (
      <div style={style}>
        {file && (
          <FileListItem
            file={file}
            selected={isSelected(file)}
            onSelect={(event: React.MouseEvent) => handleSelect(file, event)}
            onContextMenu={(event) => onContextMenu(event, file)}
            onMoreClick={(event) => onMoreClick(event, file)}
            onDoubleClick={() => handleDoubleClick(file)}
          />
        )}
      </div>
    );
  }, [files, isSelected, handleSelect, onContextMenu, onMoreClick, handleDoubleClick]);

  if (viewMode === 'list') {
    return (
      <Box sx={{ height: '100%', overflow: 'hidden' }}>
        <VirtualizedList
          items={files}
          itemHeight={ITEM_HEIGHT}
          renderItem={renderListItem}
          overscanCount={5}
        />
      </Box>
    );
  }

  // Grid view
  return (
    <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      <Grid container spacing={GRID_SPACING}>
        {files.map(file => (
          <Grid item xs={12 / GRID_COLUMNS} key={file.path}>
            <FileGridItem
              file={file}
              selected={isSelected(file)}
              onSelect={(event: React.MouseEvent) => handleSelect(file, event)}
              onContextMenu={(event) => onContextMenu(event, file)}
              onMoreClick={(event) => onMoreClick(event, file)}
              onDoubleClick={() => handleDoubleClick(file)}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
} 