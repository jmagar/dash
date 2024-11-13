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
  Alert,
} from '@mui/material';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { FileItem } from '../../types';
import { readFile, writeFile } from '../api';
import { useAsync, useKeyPress } from '../hooks';
import { logger } from '../utils/frontendLogger';

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
  const [error, setError] = useState<string | null>(null);
  const editRef = useRef<HTMLDivElement>(null);

  const handleReadFile = useCallback(async () => {
    try {
      logger.info('Reading file', { path: item.path, hostId: String(hostId) });
      const result = await readFile(hostId, item.path);
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to read file');
      }
      logger.info('File read successfully', { path: item.path });
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to read file';
      logger.error('Error reading file:', { error: errorMessage, path: item.path });
      throw new Error(errorMessage);
    }
  }, [hostId, item.path]);

  const handleWriteFile = useCallback(async () => {
    try {
      logger.info('Writing file', { path: item.path, hostId: String(hostId) });
      const result = await writeFile(hostId, item.path, content);
      if (!result.success) {
        throw new Error(result.error || 'Failed to write file');
      }
      logger.info('File written successfully', { path: item.path });
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to write file';
      logger.error('Error writing file:', { error: errorMessage, path: item.path });
      throw new Error(errorMessage);
    }
  }, [hostId, item.path, content]);

  const { execute: executeRead, loading: loadingRead } = useAsync<string>(handleReadFile);
  const { execute: executeWrite, loading: loadingWrite } = useAsync<boolean>(handleWriteFile);

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
      try {
        setError(null);
        const fileContent = await executeRead();
        setContent(fileContent);
        setIsEditing(true);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to read file';
        setError(errorMessage);
      }
    }
  };

  const handleSave = async (): Promise<void> => {
    if (item.type === 'file') {
      try {
        setError(null);
        await executeWrite();
        setIsEditing(false);
        setContent('');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to save file';
        setError(errorMessage);
      }
    }
  };

  const handleCancel = (): void => {
    setIsEditing(false);
    setContent('');
    setError(null);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setContent(e.target.value);
  };

  const handleClick = (): void => {
    if (item.type === 'directory' && onNavigate) {
      logger.info('Navigating to directory', { path: item.path });
      onNavigate(item.path);
    }
  };

  const handleDelete = (): void => {
    logger.info('Deleting file/directory', { path: item.path });
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
        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}
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
