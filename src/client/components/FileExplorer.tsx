import {
  Box,
  Button,
  IconButton,
  InputBase,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  CreateNewFolder as CreateNewFolderIcon,
  ArrowBack as ArrowBackIcon,
  Computer as ComputerIcon,
} from '@mui/icons-material';
import React, { useState, useEffect, useCallback } from 'react';

import type { FileItem } from '../../types/models-shared';
import { listFiles, deleteFile, createDirectory, searchFiles } from '../api/fileExplorer.client';
import { useHost } from '../context/HostContext';
import { useDebounce, useKeyPress } from '../hooks';
import FileListItem from './FileListItem';
import HostSelector from './HostSelector';
import LoadingScreen from './LoadingScreen';
import { logger } from '../utils/logger';

export default function FileExplorer() {
  const { selectedHost } = useHost();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState('/');
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
      const fileList = await listFiles(selectedHost.id, path);
      setFiles(fileList);
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

  useEffect(() => {
    if (selectedHost) {
      void loadFiles(currentPath);
    }
  }, [selectedHost, currentPath, loadFiles]);

  useEffect(() => {
    if (debouncedSearch) {
      void handleSearch();
    } else if (selectedHost) {
      void loadFiles(currentPath);
    }
  }, [debouncedSearch, selectedHost, currentPath, loadFiles]);

  const handleSearch = async () => {
    if (!selectedHost || !searchQuery.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const results = await searchFiles(selectedHost.id, currentPath, searchQuery);
      setFiles(results);
    } catch (err) {
      logger.error('Failed to search files:', {
        hostId: selectedHost.id,
        path: currentPath,
        query: searchQuery,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      setError('Failed to search files');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    setSearchQuery('');
  };

  const handleCreateDirectory = async () => {
    if (!selectedHost || !newFolderName.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const newPath = `${currentPath}/${newFolderName}`.replace(/\/+/g, '/');
      await createDirectory(selectedHost.id, newPath);
      setCreateFolderDialogOpen(false);
      setNewFolderName('');
      await loadFiles(currentPath);
    } catch (err) {
      logger.error('Failed to create directory:', {
        hostId: selectedHost.id,
        path: currentPath,
        folderName: newFolderName,
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
        hostId: selectedHost.id,
        path,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      setError('Failed to delete file');
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      if (createFolderDialogOpen && newFolderName) {
        void handleCreateDirectory();
      } else if (searchQuery) {
        void handleSearch();
      }
    }
  };

  const breadcrumbs = currentPath.split('/').filter(Boolean);
  const filteredFiles = files.sort((a, b) => {
    if (a.type === 'directory' && b.type !== 'directory') return -1;
    if (a.type !== 'directory' && b.type === 'directory') return 1;
    return a.name.localeCompare(b.name);
  });

  if (!selectedHost) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Button
          variant="outlined"
          startIcon={<ComputerIcon />}
          onClick={() => setHostSelectorOpen(true)}
        >
          Select Host
        </Button>
        <HostSelector
          open={hostSelectorOpen}
          onClose={() => setHostSelectorOpen(false)}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton
            disabled={currentPath === '/'}
            onClick={() => handleNavigate(currentPath.split('/').slice(0, -1).join('/') || '/')}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="subtitle1" sx={{ ml: 1 }}>
            {breadcrumbs.length === 0 ? '/' : breadcrumbs.join(' / ')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Paper
            sx={{
              p: '2px 4px',
              display: 'flex',
              alignItems: 'center',
              flex: 1,
            }}
          >
            <InputBase
              sx={{ ml: 1, flex: 1 }}
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <IconButton onClick={() => void handleSearch()}>
              <SearchIcon />
            </IconButton>
          </Paper>
          <Button
            variant="contained"
            startIcon={<CreateNewFolderIcon />}
            onClick={() => setCreateFolderDialogOpen(true)}
          >
            New Folder
          </Button>
        </Box>
      </Paper>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Modified</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <LoadingScreen />
                </TableCell>
              </TableRow>
            ) : filteredFiles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  No files found
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
        onClose={() => setCreateFolderDialogOpen(false)}
      >
        <DialogTitle>Create New Folder</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Folder Name"
            fullWidth
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyPress={handleKeyPress}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <CreateNewFolderIcon />
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateFolderDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => void handleCreateDirectory()}
            disabled={!newFolderName.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
