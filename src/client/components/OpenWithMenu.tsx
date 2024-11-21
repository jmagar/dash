import React from 'react';
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import {
  Code as CodeIcon,
  Description as DescriptionIcon,
  Launch as LaunchIcon,
} from '@mui/icons-material';
import type { FileInfo } from './FileExplorer';

interface OpenWithMenuProps {
  file: FileInfo | null;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  hostId: string;
}

export function OpenWithMenu({ file, anchorEl, onClose, hostId }: OpenWithMenuProps) {
  const handleOpenInCodeServer = async () => {
    if (!file) return;
    
    // Construct the code-server URL - assuming it's running on the same host but different port
    // You may need to adjust this URL based on your code-server configuration
    const codeServerUrl = `http://localhost:8080/?folder=/workspace${file.path}`;
    window.open(codeServerUrl, '_blank');
  };

  const handleOpenInSystemDefault = async () => {
    if (!file) return;
    try {
      // Make an API call to open the file with the system's default application
      const response = await fetch(`/api/hosts/${hostId}/files/open`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: file.path }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to open file');
      }
    } catch (error) {
      console.error('Error opening file:', error);
    }
    onClose();
  };

  if (!file) return null;

  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'center',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'center',
        horizontal: 'left',
      }}
    >
      <MenuItem onClick={handleOpenInCodeServer}>
        <ListItemIcon>
          <CodeIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Open in Code Server</ListItemText>
      </MenuItem>
      <MenuItem onClick={handleOpenInSystemDefault}>
        <ListItemIcon>
          <LaunchIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Open with System Default</ListItemText>
      </MenuItem>
    </Menu>
  );
}
