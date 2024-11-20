import React from 'react';
import { formatBytes, formatDate, formatPermissions } from '../utils/formatters';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';
import Typography from '@mui/material/Typography';

interface FileInfo {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  mode: number;
  modTime: string;
  owner: string;
  group: string;
}

interface FileListItemProps {
  file: FileInfo;
  onOpen: (file: FileInfo) => void;
  onSelect?: (file: FileInfo, selected: boolean) => void;
  selected?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, file: FileInfo) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

export function FileListItem({
  file,
  onOpen,
  onSelect,
  selected = false,
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
}: FileListItemProps) {
  const getFileIcon = (file: FileInfo): string => {
    if (file.isDirectory) return '📁';
    const ext = file.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'txt':
      case 'md':
      case 'log':
        return '📄';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return '🖼️';
      case 'mp3':
      case 'wav':
      case 'ogg':
        return '🎵';
      case 'mp4':
      case 'avi':
      case 'mov':
        return '🎥';
      case 'zip':
      case 'tar':
      case 'gz':
      case '7z':
        return '📦';
      case 'pdf':
        return '📕';
      case 'doc':
      case 'docx':
        return '📘';
      case 'xls':
      case 'xlsx':
        return '📗';
      case 'ppt':
      case 'pptx':
        return '📙';
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
        return '⚡';
      case 'html':
      case 'css':
        return '🌐';
      case 'json':
      case 'yml':
      case 'yaml':
        return '⚙️';
      case 'sh':
      case 'bash':
        return '💻';
      default:
        return '📄';
    }
  };

  return (
    <ListItem
      button
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, file)}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey || e.shiftKey) {
          onSelect?.(file, !selected);
        } else {
          onOpen(file);
        }
      }}
      selected={selected}
      sx={{
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: 'action.hover',
        },
      }}
    >
      <ListItemIcon>
        <Checkbox
          edge="start"
          checked={selected}
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(file, !selected);
          }}
          sx={{ mr: 1 }}
        />
        <span role="img" aria-label={file.isDirectory ? 'Folder' : 'File'}>
          {getFileIcon(file)}
        </span>
      </ListItemIcon>
      <ListItemText
        primary={file.name}
        secondary={
          <Typography variant="body2" color="text.secondary">
            {formatBytes(file.size)} • {formatDate(file.modTime)}
          </Typography>
        }
      />
    </ListItem>
  );
}
