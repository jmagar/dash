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
  _hostId: number;
}

export default function FileExplorer({ _hostId }: FileExplorerProps): JSX.Element {
  const { hosts, selectedHost, setSelectedHost } = useHost();
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [hostSelectorOpen, setHostSelectorOpen] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const loadFiles = useCallback(async (path: string) => {
    if (!selectedHost) return;

    try {
      setLoading(true);
      setError(null);
      const data = await listFiles(selectedHost.id, path);
      setFiles(data);
    } catch (err) {
      logger.error('Failed to load files:', {
        hostId: selectedHost.id,
        path,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      setError('Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [selectedHost]);

  const handleSearch = useCallback(async () => {
    if (!selectedHost || !searchQuery.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const data = await searchFiles(selectedHost.id, searchQuery);
      setFiles(data);
    } catch (err) {
      logger.error('Failed to search files:', {
        hostId: selectedHost.id,
        query: searchQuery,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      setError('Failed to search files');
    } finally {
      setLoading(false);
    }
  }, [selectedHost, searchQuery]);

  useEffect(() => {
    if (selectedHost) {
      void loadFiles(currentPath);
    }
  }, [selectedHost, currentPath, loadFiles]);

  useEffect(() => {
    if (debouncedSearch) {
      void handleSearch();
    }
  }, [debouncedSearch, handleSearch]);

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
  };

  const handleCreateDirectory = async () => {
    if (!selectedHost || !newFolderName.trim()) return;

    try {
      setLoading(true);
      setError(null);
      await createDirectory(selectedHost.id, `${currentPath}/${newFolderName}`);
      await loadFiles(currentPath);
      setCreateFolderDialogOpen(false);
      setNewFolderName('');
    } catch (err) {
      logger.error('Failed to create directory:', {
        hostId: selectedHost.id,
        path: `${currentPath}/${newFolderName}`,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      setError('Failed to create directory');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (path: string) => {
    if (!selectedHost) return;

    try {
      setError(null);
      await deleteFile(selectedHost.id, path);
      await loadFiles(currentPath);
    } catch (err) {
      logger.error('Failed to delete file:', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      setError('Failed to delete file');
    }
  };

  const handleHostSelect = (selectedHosts: Host[]) => {
    if (selectedHosts.length > 0) {
      setSelectedHost(selectedHosts[0]);
    }
    setHostSelectorOpen(false);
  };

  if (!selectedHost) {
    return (
      <Box sx={{ p: 3 }}>
        <Button variant="contained" onClick={(): void => setHostSelectorOpen(true)}>
          Select Host
        </Button>
        <HostSelector
          hosts={hosts}
          open={hostSelectorOpen}
          onClose={(): void => setHostSelectorOpen(false)}
          onSelect={handleHostSelect}
        />
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
          {selectedHost.name} - {currentPath}
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
