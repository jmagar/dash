import {
  Add as AddIcon,
  Search as SearchIcon,
  ArrowUpward as ArrowUpIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
} from '@mui/material';
import React, { useState } from 'react';

import type { FileItem, Host } from '../../types';
import { listFiles, deleteFile, createDirectory } from '../api';
import { useHost } from '../context/HostContext';
import { useAsync, useDebounce, useKeyPress } from '../hooks';
import FileListItem from './FileListItem';
import HostSelector from './HostSelector';
import LoadingScreen from './LoadingScreen';
import { logger } from '../utils/frontendLogger';

export default function FileExplorer(): JSX.Element {
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [hostSelectorOpen, setHostSelectorOpen] = useState(false);
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const debouncedSearch = useDebounce(searchTerm, 300);
  const { hosts } = useHost();

  const loadFilesList = async (): Promise<FileItem[]> => {
    if (!selectedHost) return [];
    const response = await listFiles(selectedHost.id, currentPath);
    if (!response.success) {
      logger.error('Failed to load files:', { error: response.error });
      throw new Error(response.error || 'Failed to load files');
    }
    return response.data || [];
  };

  const {
    data: files,
    loading,
    error: loadError,
    execute: loadFiles,
  } = useAsync(loadFilesList, {
    deps: [selectedHost?.id, currentPath],
    immediate: !!selectedHost,
  });

  const filteredFiles = files?.filter(file =>
    file.name.toLowerCase().includes(debouncedSearch.toLowerCase()),
  );

  const handleHostSelect = (selectedHosts: Host[]): void => {
    if (selectedHosts.length > 0) {
      setSelectedHost(selectedHosts[0]);
      logger.info('Host selected for file explorer', { hostId: String(selectedHosts[0].id) });
    }
    setHostSelectorOpen(false);
  };

  const handleNavigate = (path: string): void => {
    setCurrentPath(path);
    logger.info('Navigated to path', { path });
  };

  const handleNavigateUp = (): void => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
    setCurrentPath(parentPath);
    logger.info('Navigated up to path', { path: parentPath });
  };

  const handleCreateFolder = async (): Promise<void> => {
    if (!selectedHost || !newFolderName.trim()) return;

    try {
      const newPath = `${currentPath}/${newFolderName}`.replace(/\/+/g, '/');
      const result = await createDirectory(selectedHost.id, newPath);
      if (result.success) {
        logger.info('Created new folder', { path: newPath });
        setCreateFolderDialogOpen(false);
        setNewFolderName('');
        void loadFiles();
      } else {
        logger.error('Failed to create folder:', { error: result.error });
        setError(result.error || 'Failed to create folder');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create folder';
      logger.error('Error creating folder:', { error: errorMessage });
      setError(errorMessage);
    }
  };

  const handleDeleteFile = async (path: string): Promise<void> => {
    if (!selectedHost) return;

    try {
      const result = await deleteFile(selectedHost.id, path);
      if (result.success) {
        logger.info('Deleted file', { path });
        void loadFiles();
      } else {
        logger.error('Failed to delete file:', { error: result.error });
        setError(result.error || 'Failed to delete file');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete file';
      logger.error('Error deleting file:', { error: errorMessage });
      setError(errorMessage);
    }
  };

  const handleNewFolderKeyPress = (e: KeyboardEvent): void => {
    if (e.ctrlKey && e.key === 'n') {
      e.preventDefault();
      setCreateFolderDialogOpen(true);
    }
  };

  useKeyPress('n', handleNewFolderKeyPress);

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

  if (loadError) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{loadError}</Typography>
        <Button variant="contained" onClick={(): void => void loadFiles()}>
          Retry
        </Button>
      </Box>
    );
  }

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
            onClick={handleNavigateUp}
            disabled={currentPath === '/'}
          >
            Up
          </Button>
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          <TextField
            size="small"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e): void => setSearchTerm(e.target.value)}
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
            {filteredFiles?.map((item) => (
              <FileListItem
                key={item.path}
                item={item}
                hostId={selectedHost.id}
                onNavigate={handleNavigate}
                onDelete={handleDeleteFile}
              />
            ))}
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
          <Button onClick={(): void => void handleCreateFolder()} disabled={!newFolderName.trim()}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
