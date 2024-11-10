import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import {
  Box,
  IconButton,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { FileItem, ApiResult } from '../../types';
import { readFile, writeFile } from '../api';
import { useAsync, useKeyPress } from '../hooks';

interface Props {
  item: FileItem;
  onDelete: (path: string) => void;
  onNavigate?: (path: string) => void;
  hostId: number;
}

export default function FileListItem({
  item,
  onDelete,
  onNavigate,
  hostId,
}: Props): JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState('');
  const editRef = useRef<HTMLDivElement>(null);

  const handleReadFile = useCallback(() => readFile(hostId, item.path), [hostId, item.path]);
  const handleWriteFile = useCallback(() => writeFile(hostId, item.path, content), [hostId, item.path, content]);

  const { execute: executeRead, loading: loadingRead } = useAsync<ApiResult<string>>(handleReadFile);
  const { execute: executeWrite, loading: loadingWrite } = useAsync<ApiResult<void>>(handleWriteFile);

  const handleKeyPress = (e: KeyboardEvent): void => {
    if (e.key === 'Enter' && isEditing) {
      void handleSave();
    } else if (e.key === 'Escape' && isEditing) {
      handleCancel();
    }
  };

  useKeyPress('Enter', handleKeyPress);
  useKeyPress('Escape', handleKeyPress);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent): void => {
      if (editRef.current && !editRef.current.contains(event.target as Node)) {
        if (isEditing) {
          handleCancel();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isEditing]);

  const handleEdit = async (): Promise<void> => {
    if (item.type === 'file') {
      const result = await executeRead();
      if (result.success && result.data) {
        setContent(result.data);
        setIsEditing(true);
      }
    }
  };

  const handleSave = async (): Promise<void> => {
    if (item.type === 'file') {
      const result = await executeWrite();
      if (result.success) {
        setIsEditing(false);
      }
    }
  };

  const handleCancel = (): void => {
    setIsEditing(false);
    setContent('');
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setContent(e.target.value);
  };

  const handleClick = (): void => {
    if (item.type === 'directory' && onNavigate) {
      onNavigate(item.path);
    }
  };

  const handleDelete = (): void => {
    onDelete(item.path);
  };

  if (isEditing) {
    return (
      <Box ref={editRef} sx={{ p: 2, width: '100%' }}>
        <TextField
          fullWidth
          multiline
          rows={10}
          value={content}
          onChange={handleContentChange}
          disabled={loadingWrite}
        />
        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <IconButton onClick={handleCancel} disabled={loadingWrite}>
            <CancelIcon />
          </IconButton>
          <IconButton onClick={(): void => void handleSave()} disabled={loadingWrite}>
            <SaveIcon />
          </IconButton>
        </Box>
      </Box>
    );
  }

  return (
    <ListItem
      onClick={handleClick}
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        cursor: item.type === 'directory' ? 'pointer' : 'default',
      }}
    >
      <ListItemIcon>
        {item.type === 'directory' ? <FolderIcon /> : <FileIcon />}
      </ListItemIcon>
      <ListItemText
        primary={item.name}
        secondary={
          <Typography variant="body2" color="textSecondary">
            {item.size} bytes
          </Typography>
        }
      />
      {item.type === 'file' && (
        <IconButton
          onClick={(): void => void handleEdit()}
          disabled={loadingRead}
          sx={{ mr: 1 }}
        >
          <EditIcon />
        </IconButton>
      )}
      <IconButton onClick={handleDelete}>
        <DeleteIcon />
      </IconButton>
    </ListItem>
  );
}
