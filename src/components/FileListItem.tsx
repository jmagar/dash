import {
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import {
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Theme,
} from '@mui/material';
import React, { useState } from 'react';

import CodeEditor from './CodeEditor';
import { readFile, writeFile } from '../api/fileExplorer';
import type { FileItem } from '../types';

interface FileListItemProps {
  file: FileItem;
  hostId: number;
  onNavigate?: (path: string) => void;
  onDelete?: (path: string) => void;
  onError?: (error: string) => void;
}

const isTextFile = (fileName: string): boolean => {
  const textExtensions = [
    'txt', 'md', 'json', 'yaml', 'yml', 'xml', 'html', 'css', 'js', 'jsx', 'ts', 'tsx',
    'conf', 'config', 'ini', 'sh', 'bash', 'env', 'log', 'sql', 'properties',
  ];
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  return textExtensions.includes(extension) ||
         fileName.startsWith('.env') ||
         fileName.includes('.env.');
};

const getLanguageFromFileName = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    html: 'html',
    css: 'css',
    md: 'markdown',
    sql: 'sql',
    sh: 'shell',
    bash: 'shell',
    env: 'ini',
  };

  // Special handling for .env files
  if (fileName.startsWith('.env') || fileName.includes('.env.')) {
    return 'ini';
  }

  return languageMap[extension] || 'plaintext';
};

const FileListItem: React.FC<FileListItemProps> = ({
  file,
  hostId,
  onNavigate,
  onDelete,
  onError,
}) => {
  const [editorOpen, setEditorOpen] = useState(false);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const handleEdit = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    try {
      setLoading(true);
      const result = await readFile(hostId, file.path);
      if (result.success && result.data) {
        setFileContent(result.data);
        setEditorOpen(true);
      } else {
        onError?.(result.error || 'Failed to read file');
      }
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Failed to read file');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (content: string): Promise<void> => {
    try {
      const result = await writeFile(hostId, file.path, content);
      if (!result.success) {
        throw new Error(result.error || 'Failed to save file');
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to save file');
    }
  };

  return (
    <>
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
        {file.type === 'file' && isTextFile(file.name) && (
          <IconButton
            edge="end"
            aria-label="edit"
            onClick={handleEdit}
            disabled={loading}
            title="Edit file"
          >
            <EditIcon />
          </IconButton>
        )}
        <IconButton
          edge="end"
          aria-label="delete"
          onClick={handleDelete}
          disabled={loading}
          title="Delete file"
        >
          <DeleteIcon />
        </IconButton>
      </ListItem>

      {editorOpen && fileContent !== null && (
        <CodeEditor
          open={editorOpen}
          onClose={(): void => {
            setEditorOpen(false);
            setFileContent(null);
          }}
          onSave={handleSave}
          initialContent={fileContent}
          title={file.name}
          language={getLanguageFromFileName(file.name)}
        />
      )}
    </>
  );
};

export default FileListItem;
