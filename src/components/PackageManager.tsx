import React, { useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  Paper,
  TextField,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  InputAdornment,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Search as SearchIcon,
  History as HistoryIcon,
  Add as AddIcon,
  Update as UpdateIcon,
} from '@mui/icons-material';
import { useAsync, useDebounce } from '../hooks';
import { installPackage, uninstallPackage, updatePackage } from '../api/packageManager';
import { Host, Package } from '../types';
import HostSelector from './HostSelector';
import LoadingScreen from './LoadingScreen';

const PackageManager: React.FC = () => {
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [hostSelectorOpen, setHostSelectorOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, { delay: 300 });

  const {
    data: packages,
    loading,
    error,
    execute: loadPackages,
  } = useAsync<Package[]>(
    async () => {
      if (!selectedHost) {
        throw new Error('No host selected');
      }
      const response = await fetch(`/api/packages/${selectedHost.id}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load packages');
      }
      return data;
    },
    {
      deps: [selectedHost?.id],
      immediate: !!selectedHost,
    }
  );

  const handleHostSelect = (hosts: Host[]): void => {
    setSelectedHost(hosts[0]);
    setHostSelectorOpen(false);
  };

  const handleInstall = async (pkg: Package): Promise<void> => {
    if (!selectedHost) return;
    try {
      await installPackage(selectedHost.id, pkg.name);
      void loadPackages();
    } catch (error) {
      console.error('Failed to install package:', error);
    }
  };

  const handleUninstall = async (pkg: Package): Promise<void> => {
    if (!selectedHost) return;
    try {
      await uninstallPackage(selectedHost.id, pkg.name);
      void loadPackages();
    } catch (error) {
      console.error('Failed to uninstall package:', error);
    }
  };

  const handleUpdate = async (pkg: Package): Promise<void> => {
    if (!selectedHost) return;
    try {
      await updatePackage(selectedHost.id, pkg.name);
      void loadPackages();
    } catch (error) {
      console.error('Failed to update package:', error);
    }
  };

  const filteredPackages = packages?.filter(pkg =>
    pkg.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    pkg.description?.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

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
    return <LoadingScreen fullscreen={false} message="Loading packages..." />;
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
        <Button variant="contained" onClick={() => void loadPackages()}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h5">Package Manager</Typography>
        <Typography variant="subtitle1" color="textSecondary">
          {selectedHost.name} - {selectedHost.hostname}:{selectedHost.port}
        </Typography>
        <Box sx={{ flexGrow: 1 }}>
          <TextField
            size="small"
            placeholder="Search packages..."
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
        <IconButton onClick={() => void loadPackages()} title="Refresh packages">
          <HistoryIcon />
        </IconButton>
      </Box>

      <Paper>
        <List>
          {filteredPackages?.map((pkg) => (
            <ListItem key={pkg.name}>
              <ListItemText
                primary={pkg.name}
                secondary={`${pkg.version}${pkg.description ? ` - ${pkg.description}` : ''}`}
              />
              <ListItemSecondaryAction>
                {pkg.installed ? (
                  <>
                    {pkg.updateAvailable && (
                      <IconButton
                        edge="end"
                        onClick={() => void handleUpdate(pkg)}
                        title="Update package"
                      >
                        <UpdateIcon />
                      </IconButton>
                    )}
                    <IconButton
                      edge="end"
                      onClick={() => void handleUninstall(pkg)}
                      title="Uninstall package"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </>
                ) : (
                  <IconButton
                    edge="end"
                    onClick={() => void handleInstall(pkg)}
                    title="Install package"
                  >
                    <AddIcon />
                  </IconButton>
                )}
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

export default PackageManager;
