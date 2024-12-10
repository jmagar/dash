import React, { useCallback } from 'react';
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Code as CodeIcon,
  Description as DescriptionIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import type { FileInfo } from '../../../../../types/files';
import { useFileOperations } from '../../hooks/useFileOperations';

interface OpenWithMenuProps {
  file: FileInfo;
  hostId: string;
  anchorEl: HTMLElement | null;
  onClose: () => void;
}

export function OpenWithMenu({ file, hostId, anchorEl, onClose }: OpenWithMenuProps): JSX.Element {
  const { operations } = useFileOperations(hostId, file.path);

  const handleOpenWith = useCallback(async (app: string) => {
    try {
      await operations.openFile(file.path, app);
      onClose();
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  }, [file.path, operations, onClose]);

  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'left',
      }}
    >
      <MenuItem onClick={() => void handleOpenWith('text')}>
        <ListItemIcon>
          <CodeIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Text Editor</ListItemText>
      </MenuItem>
      <MenuItem onClick={() => void handleOpenWith('document')}>
        <ListItemIcon>
          <DescriptionIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Document Viewer</ListItemText>
      </MenuItem>
      <MenuItem onClick={() => void handleOpenWith('image')}>
        <ListItemIcon>
          <ImageIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Image Viewer</ListItemText>
      </MenuItem>
    </Menu>
  );
} 