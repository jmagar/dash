import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  TextField,
  Typography,
  InputAdornment,
  Theme,
} from '@mui/material';
import {
  ArrowUpward as UpIcon,
  Add as AddIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useAsync, useDebounce, useKeyPress, useClickOutside } from '../hooks';
import { listFiles, deleteFile, createDirectory } from '../api/fileExplorer';
import { FileItem, Host } from '../types';
import HostSelector from './HostSelector';
import LoadingScreen from './LoadingScreen';
import FileListItem from './FileListItem';

interface CreateFolderDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
}

const CreateFolderDialog: React.FC<CreateFolderDialogProps> = ({ open, onClose, onConfirm }) => {
  const [folderName, setFolderName] = useState('');
  const dialogRef = useClickOutside<HTMLDivElement>(onClose);

  useKeyPress('Escape', onClose);
  useKeyPress('Enter', () => {
    if (folderName.trim()) {
      onConfirm(folderName.trim());
      setFolderName('');
    }
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Folder</DialogTitle>
      <DialogContent ref={dialogRef}>
        <TextField
          autoFocus
          margin="dense"
          label="Folder Name"
          fullWidth
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => {
            if (folderName.trim()) {
              onConfirm(folderName.trim());
              setFolderName('');
            }
          }}
          color="primary"
          disabled={!folderName.trim()}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const FileExplorer: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [hostSelectorOpen, setHostSelectorOpen] = useState(false);
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, { delay: 300 });

  const {
    data: files,
    loading,
    error,
    execute: loadFiles,
  } = useAsync<FileItem[]>(
    async () => {
      if (!selectedHost) return [];
      const response = await listFiles(selectedHost.id, currentPath);
      return response.success ? response.data || [] : [];
    },
    {
      deps: [selectedHost?.id, currentPath],
      immediate: !!selectedHost,
    }
  );

  const filteredFiles = files?.filter(file =>
    file.name.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const handleHostSelect = (hosts: Host[]): void => {
    setSelectedHost(hosts[0]);
    setHostSelectorOpen(false);
  };

  const handleNavigate = (path: string): void => {
    setCurrentPath(path);
  };

  const handleNavigateUp = (): void => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
    setCurrentPath(parentPath);
  };

  const handleCreateFolder = async (name: string): Promise<void> => {
    if (!selectedHost) return;

    try {
      const newPath = `${currentPath}/${name}`.replace(/\/+/g, '/');
      await createDirectory(selectedHost.id, newPath);
      setCreateFolderDialogOpen(false);
      void loadFiles();
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
  };

  const handleDeleteFile = async (path: string): Promise<void> => {
    if (!selectedHost) return;

    try {
      await deleteFile(selectedHost.id, path);
      void loadFiles();
    } catch (err) {
      console.error('Failed to delete file:', err);
    }
  };

  useKeyPress('n', (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      setCreateFolderDialogOpen(true);
    }
  });

  if (!selectedHost) {
    return (
      <Box sx={{ p: 3 }}>
        <Button variant="contained" onClick={() => setHostSelectorOpen(true)}>
          Select Host
        </Button>
        <HostSelector
          open={hostSelectorOpen}
          onClose={() => setHostSelectorOpen(false)}
          onSelect={handleHostSelect}
          multiSelect={false}
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
        <Button variant="contained" onClick={() => void loadFiles()}>
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
        <Box sx={{ flexGrow: 1 }}>
          <TextField
            size="small"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
          onClick={() => setCreateFolderDialogOpen(true)}
        >
          New Folder
        </Button>
      </Box>

      <Paper>
        <List>
          {currentPath !== '/' && (
            <ListItem
              onClick={handleNavigateUp}
              sx={{
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: (theme: Theme) => theme.palette.action.hover,
                },
              }}
            >
              <ListItemIcon>
                <UpIcon />
              </ListItemIcon>
              <ListItemText primary=".." secondary="Parent Directory" />
            </ListItem>
          )}
          {filteredFiles?.map((file) => (
            <FileListItem
              key={file.path}
              file={file}
              onNavigate={handleNavigate}
              onDelete={handleDeleteFile}
            />
          ))}
        </List>
      </Paper>

      <CreateFolderDialog
        open={createFolderDialogOpen}
        onClose={() => setCreateFolderDialogOpen(false)}
        onConfirm={handleCreateFolder}
      />
    </Box>
  );
};

export default FileExplorer;
