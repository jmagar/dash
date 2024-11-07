import React from 'react';
import {
  Box,
  Button,
  IconButton,
  TextField,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListItemIcon,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Computer as ComputerIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useAsync, useDebounce, useClickOutside } from '../hooks';
import { getHostStatus, deleteHost } from '../api/hosts';
import { Host } from '../types';
import LoadingScreen from './LoadingScreen';

interface HostSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (hosts: Host[]) => void;
  multiSelect?: boolean;
  selectedHosts?: Host[];
}

const HostSelector: React.FC<HostSelectorProps> = ({
  open,
  onClose,
  onSelect,
  multiSelect = false,
  selectedHosts = [],
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selected, setSelected] = React.useState<Host[]>(selectedHosts);
  const debouncedSearch = useDebounce(searchTerm, { delay: 300 });
  const dialogRef = useClickOutside<HTMLDivElement>(onClose);

  const {
    data: hosts,
    loading,
    error,
    execute: loadHosts,
  } = useAsync<Host[]>(
    async () => {
      const response = await getHostStatus();
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to load hosts');
      }
      return response.data;
    },
    {
      immediate: true,
    }
  );

  const handleSelect = (host: Host): void => {
    if (multiSelect) {
      const isSelected = selected.some((h) => h.id === host.id);
      if (isSelected) {
        setSelected(selected.filter((h) => h.id !== host.id));
      } else {
        setSelected([...selected, host]);
      }
    } else {
      setSelected([host]);
      onSelect([host]);
      onClose();
    }
  };

  const handleConfirm = (): void => {
    onSelect(selected);
    onClose();
  };

  const handleDelete = async (host: Host, e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    try {
      const response = await deleteHost(host.id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete host');
      }
      void loadHosts();
    } catch (error) {
      console.error('Failed to delete host:', error);
    }
  };

  const filteredHosts = hosts?.filter(
    (host) =>
      host.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      host.hostname.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      host.ip.includes(debouncedSearch)
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      ref={dialogRef}
      PaperProps={{
        sx: {
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <DialogTitle>Select Host</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            placeholder="Search hosts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {loading ? (
          <LoadingScreen fullscreen={false} message="Loading hosts..." />
        ) : error ? (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography color="error">{error}</Typography>
            <Button variant="contained" onClick={() => void loadHosts()} sx={{ mt: 1 }}>
              Retry
            </Button>
          </Box>
        ) : (
          <List>
            {filteredHosts?.map((host) => (
              <ListItem
                key={host.id}
                onClick={() => handleSelect(host)}
                selected={selected.some((h) => h.id === host.id)}
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <ListItemIcon>
                  <ComputerIcon color={host.isActive ? 'success' : 'error'} />
                </ListItemIcon>
                <ListItemText
                  primary={host.name}
                  secondary={`${host.hostname}:${host.port} - ${host.ip}`}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    onClick={(e) => void handleDelete(host, e)}
                    title="Delete host"
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {multiSelect && (
          <Button onClick={handleConfirm} color="primary" disabled={selected.length === 0}>
            Select ({selected.length})
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default HostSelector;
