import {
  Delete as DeleteIcon,
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import {
  TableRow,
  TableCell,
  IconButton,
  Tooltip,
} from '@mui/material';
import React from 'react';

import type { FileItem } from '../../types/models-shared';

interface FileListItemProps {
  item: FileItem;
  onNavigate: (path: string) => void;
  onDelete: (path: string) => void;
}

export default function FileListItem({ item, onNavigate, onDelete }: FileListItemProps): JSX.Element {
  const handleClick = () => {
    if (item.type === 'directory') {
      onNavigate(item.path);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(item.path);
  };

  return (
    <TableRow
      hover
      onClick={handleClick}
      sx={{ cursor: item.type === 'directory' ? 'pointer' : 'default' }}
    >
      <TableCell>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {item.type === 'directory' ? <FolderIcon color="primary" /> : <FileIcon />}
          {item.name}
        </div>
      </TableCell>
      <TableCell>{item.type === 'file' ? formatSize(item.size) : '--'}</TableCell>
      <TableCell>
        <Tooltip title="Delete">
          <IconButton
            size="small"
            onClick={handleDelete}
          >
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}

function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(1)} ${units[unitIndex]}`;
}
