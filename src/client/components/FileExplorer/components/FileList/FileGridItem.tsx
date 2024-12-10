import React from 'react';
import { Box, IconButton, Typography, Paper } from '@mui/material';
import {
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import type { FileInfo } from '../../../../../types/files';

interface FileGridItemProps {
  file: FileInfo;
  onSelect: (event: React.MouseEvent) => void;
  onContextMenu: (event: React.MouseEvent) => void;
  onMoreClick: (event: React.MouseEvent) => void;
  onDoubleClick?: () => void;
  selected?: boolean;
}

export function FileGridItem({
  file,
  onSelect,
  onContextMenu,
  onMoreClick,
  onDoubleClick,
  selected
}: FileGridItemProps): JSX.Element {
  return (
    <Paper
      elevation={selected ? 4 : 1}
      sx={{
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: 'action.hover'
        }
      }}
      onClick={onSelect}
      onContextMenu={onContextMenu}
      onDoubleClick={onDoubleClick}
    >
      <Box sx={{ position: 'relative', width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
          {file.type === 'directory' ? (
            <FolderIcon sx={{ fontSize: 48 }} color="primary" />
          ) : (
            <FileIcon sx={{ fontSize: 48 }} color="action" />
          )}
        </Box>
        <IconButton
          size="small"
          sx={{ position: 'absolute', top: 0, right: 0 }}
          onClick={onMoreClick}
        >
          <MoreVertIcon />
        </IconButton>
      </Box>
      <Typography
        variant="body2"
        align="center"
        noWrap
        sx={{ width: '100%', mt: 1 }}
      >
        {file.name}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {file.size ? `${file.size} bytes` : ''}
      </Typography>
    </Paper>
  );
} 