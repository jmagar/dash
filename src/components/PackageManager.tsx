import React, { useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Paper,
  TextField,
  Typography,
  InputAdornment,
  Theme,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Update as UpdateIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useAsync, useDebounce, useKeyPress } from '../hooks';
import { fetchPackages, installPackage, uninstallPackage, updatePackage } from '../api/packageManager';
import { Host } from '../types';
import HostSelector from './HostSelector';
import LoadingScreen from './LoadingScreen';

interface Package {
  name: string;
  version: string;
  description?: string;
  installed: boolean;
  updateAvailable: boolean;
}

const PackageManager: React.FC = () => {
  const [selectedHosts, setSelectedHosts] = useState<Host[]>([]);
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
      if (selectedHosts.length === 0) return [];
      const responses = await Promise.all(selectedHosts.map((host) => fetchPackages(host.id)));
      return responses.flatMap((response) => response.success && response.data ? response.data : []);
    },
    {
      deps: [selectedHosts],
      immediate: selectedHosts.length > 0,
    }
  );

  const filteredPackages = packages?.filter(pkg =>
    pkg.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    pkg.description?.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const handleHostSelect = (hosts: Host[]): void => {
    setSelectedHosts(hosts);
    setHostSelectorOpen(false);
  };

  const handleInstall = async (pkg: Package): Promise<void> => {
    try {
      await Promise.all(selectedHosts.map((host) => installPackage(host.id, pkg.name)));
      void loadPackages();
    } catch (err) {
      console.error('Failed to install package:', err);
    }
  };

  const handleUninstall = async (pkg: Package): Promise<void> => {
    try {
      await Promise.all(selectedHosts.map((host) => uninstallPackage(host.id, pkg.name)));
      void loadPackages();
    } catch (err) {
      console.error('Failed to uninstall package:', err);
    }
  };

  const handleUpdate = async (pkg: Package): Promise<void> => {
    try {
      await Promise.all(selectedHosts.map((host) => updatePackage(host.id, pkg.name)));
      void loadPackages();
    } catch (err) {
      console.error('Failed to update package:', err);
    }
  };

  useKeyPress('r', (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      void loadPackages();
    }
  });

  if (selectedHosts.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Button variant="contained" onClick={() => setHostSelectorOpen(true)}>
          Select Hosts
        </Button>
        <HostSelector
          open={hostSelectorOpen}
          onClose={() => setHostSelectorOpen(false)}
          onSelect={handleHostSelect}
          multiSelect={true}
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
          {selectedHosts.map(h => h.name).join(', ')}
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
        <IconButton onClick={() => void loadPackages()} title="Refresh (Ctrl+R)">
          <RefreshIcon />
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
