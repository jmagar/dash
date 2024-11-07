import React from 'react';
import {
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Theme,
} from '@mui/material';
import {
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { FileItem } from '../types';

interface FileListItemProps {
  file: FileItem;
  onNavigate?: (path: string) => void;
  onDelete?: (path: string) => void;
}

const FileListItem: React.FC<FileListItemProps> = ({ file, onNavigate, onDelete }) => {
  const handleClick = (): void => {
    if (file.type === 'directory' && onNavigate) {
      onNavigate(file.path);
    }
  };

  const handleDelete = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(file.path);
    }
  };

  return (
    <ListItem
      onClick={handleClick}
      sx={{
        cursor: file.type === 'directory' ? 'pointer' : 'default',
        '&:hover': {
          backgroundColor: (theme: Theme) =>
            file.type === 'directory' ? theme.palette.action.hover : 'inherit',
        },
      }}
    >
      <ListItemIcon>
        {file.type === 'directory' ? <FolderIcon /> : <FileIcon />}
      </ListItemIcon>
      <ListItemText
        primary={file.name}
        secondary={`${file.size} bytes - Modified: ${new Date(file.modified).toLocaleString()}`}
      />
      <IconButton
        edge="end"
        aria-label="delete"
        onClick={handleDelete}
      >
        <DeleteIcon />
      </IconButton>
    </ListItem>
  );
};

export default FileListItem;
