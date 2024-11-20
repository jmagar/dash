import React from 'react';
import { Paper, Typography, Box, Checkbox } from '@mui/material';
import { formatBytes, formatDate } from '../utils/formatters';
import { ImageThumbnail } from './ImageThumbnail';
import type { FileInfo } from './FileExplorer';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];

interface FileGridItemProps {
  file: FileInfo;
  onOpen: (file: FileInfo) => void;
  onSelect?: (file: FileInfo, selected: boolean) => void;
  selected?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, file: FileInfo) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  hostId: string;
}

export function FileGridItem({
  file,
  onOpen,
  onSelect,
  selected = false,
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
  hostId,
}: FileGridItemProps) {
  const getFileIcon = (file: FileInfo): string => {
    if (file.isDirectory) {
      return '📁';
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    switch (ext) {
      case 'txt':
      case 'md':
      case 'doc':
      case 'docx':
        return '📄';
      case 'pdf':
        return '📕';
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
      case 'webm':
      case 'mov':
        return '🎥';
      case 'zip':
      case 'tar':
      case 'gz':
        return '📦';
      default:
        return '📄';
    }
  };

  const isImage = (file: FileInfo) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    return IMAGE_EXTENSIONS.includes(ext);
  };

  return (
    <Paper
      elevation={selected ? 4 : 1}
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey || e.shiftKey) {
          onSelect?.(file, !selected);
        } else {
          onOpen(file);
        }
      }}
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, file)}
      onDragOver={onDragOver}
      onDrop={onDrop}
      sx={{
        p: 2,
        cursor: 'pointer',
        backgroundColor: selected ? 'action.selected' : 'background.paper',
        '&:hover': {
          backgroundColor: 'action.hover',
        },
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        position: 'relative',
      }}
    >
      <Checkbox
        checked={selected}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(file, !selected);
        }}
        sx={{
          position: 'absolute',
          top: 8,
          left: 8,
        }}
      />

      {isImage(file) ? (
        <ImageThumbnail
          src={`/api/hosts/${hostId}/files/content?path=${encodeURIComponent(file.path)}`}
          alt={file.name}
          size={80}
        />
      ) : (
        <Box
          sx={{
            fontSize: '2rem',
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {getFileIcon(file)}
        </Box>
      )}

      <Typography
        variant="body2"
        align="center"
        sx={{
          mt: 1,
          px: 1,
          width: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {file.name}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
      >
        {formatBytes(file.size)}
      </Typography>
    </Paper>
  );
}
