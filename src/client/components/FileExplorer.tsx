import { Add as AddIcon, Search as SearchIcon, ArrowUpward as ArrowUpIcon } from '@mui/icons-material';
import { Box, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Alert, TextField, Dialog, DialogTitle, DialogContent, DialogActions, InputAdornment } from '@mui/material';
import React, { useState, useEffect, useCallback } from 'react';

import type { FileItem, Host } from '../../types';
import { listFiles, deleteFile, createDirectory, searchFiles } from '../api/fileExplorer.client';
import { useHost } from '../context/HostContext';
import { useDebounce } from '../hooks';
import FileListItem from './FileListItem';
import HostSelector from './HostSelector';
import LoadingScreen from './LoadingScreen';
import { logger } from '../utils/logger';

interface FileExplorerProps {
  hostId: string;
}

export default function FileExplorer({ hostId }: FileExplorerProps): JSX.Element {
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  const loadFiles = useCallback(async (path: string) => {
    if (!hostId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await listFiles(hostId, path);
      setFiles(data);
    } catch (err) {
      logger.error('Failed to load files:', {
        hostId,
        path,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      setError('Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [hostId]);

  const handleSearch = useCallback(async () => {
    if (!hostId || !searchQuery.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const data = await searchFiles(hostId, searchQuery);
      setFiles(data);
    } catch (err) {
      logger.error('Failed to search files:', {
        hostId,
        query: searchQuery,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      setError('Failed to search files');
    } finally {
      setLoading(false);
    }
  }, [hostId, searchQuery]);

  useEffect(() => {
    void loadFiles(currentPath);
  }, [currentPath, loadFiles]);

  useEffect(() => {
    if (debouncedSearch) {
      void handleSearch();
    }
  }, [debouncedSearch, handleSearch]);

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
  };

  const handleCreateDirectory = async () => {
    if (!hostId || !newFolderName.trim()) return;

    try {
      setLoading(true);
      setError(null);
      await createDirectory(hostId, `${currentPath}/${newFolderName}`);
      await loadFiles(currentPath);
      setCreateFolderDialogOpen(false);
      setNewFolderName('');
    } catch (err) {
      logger.error('Failed to create directory:', {
        hostId,
        path: `${currentPath}/${newFolderName}`,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      setError('Failed to create directory');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (path: string) => {
    if (!hostId) return;

    try {
      setError(null);
      await deleteFile(hostId, path);
      await loadFiles(currentPath);
    } catch (err) {
      logger.error('Failed to delete file:', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      setError('Failed to delete file');
    }
  };

  if (!hostId) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">No host ID provided</Typography>
      </Box>
    );
  }

  if (loading) {
    return <LoadingScreen fullscreen={false} message="Loading files..." />;
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
        <Button variant="contained" onClick={(): void => void loadFiles(currentPath)}>
          Retry
        </Button>
      </Box>
    );
  }

  const filteredFiles = (files ?? []).filter(file =>
    file.name.toLowerCase().includes(debouncedSearch.toLowerCase()),
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h5">File Explorer</Typography>
        <Typography variant="subtitle1" color="textSecondary">
          {currentPath}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowUpIcon />}
            onClick={(): void => handleNavigate('/')}
            disabled={currentPath === '/'}
          >
            Up
          </Button>
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          <TextField
            size="small"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e): void => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            fullWidth
          />
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={(): void => setCreateFolderDialogOpen(true)}
        >
          New Folder
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={(): void => setError(null)}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredFiles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  <Typography color="textSecondary">
                    {searchQuery ? 'No matching files found' : 'No files in this directory'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredFiles.map((item) => (
                <FileListItem
                  key={item.path}
                  item={item}
                  onNavigate={handleNavigate}
                  onDelete={handleDeleteFile}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={createFolderDialogOpen}
        onClose={(): void => setCreateFolderDialogOpen(false)}
      >
        <DialogTitle>Create New Folder</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Folder Name"
            fullWidth
            value={newFolderName}
            onChange={(e): void => setNewFolderName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={(): void => setCreateFolderDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateDirectory} disabled={!newFolderName.trim()}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
