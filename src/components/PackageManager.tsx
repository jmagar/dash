
import DeleteIcon from '@mui/icons-material/Delete';
import GetAppIcon from '@mui/icons-material/GetApp';
import RefreshIcon from '@mui/icons-material/Refresh';
import UpdateIcon from '@mui/icons-material/Update';
import {
  Box,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import React, { useState } from 'react';

import {
  installPackage,
  listInstalledPackages,
  searchPackages,
  uninstallPackage,
  updatePackage,
} from '../api/packageManager';
import { useAsync, useDebounce } from '../hooks';
import type { Package } from '../types';

interface PackageManagerProps {
  hostId: number;
}

export default function PackageManager({ hostId }: PackageManagerProps): JSX.Element {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const debouncedSearch = useDebounce(searchTerm, { delay: 300 });

  const {
    data: packages,
    loading,
    error,
    execute: loadPackages,
  } = useAsync<Package[]>(
    async (): Promise<Package[]> => {
      if (!debouncedSearch) {
        const result = await listInstalledPackages(hostId);
        if (!result.success) {
          throw new Error(result.error || 'Failed to load packages');
        }
        return result.data || [];
      }
      const result = await searchPackages(hostId, debouncedSearch);
      if (!result.success) {
        throw new Error(result.error || 'Failed to search packages');
      }
      return result.data || [];
    },
    {
      deps: [hostId, debouncedSearch],
      immediate: true,
    },
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchTerm(e.target.value);
  };

  const handleInstall = async (name: string): Promise<void> => {
    try {
      const result = await installPackage(hostId, name);
      if (!result.success) {
        throw new Error(result.error || 'Failed to install package');
      }
      await loadPackages();
    } catch (err) {
      console.error('Failed to install package:', err);
    }
  };

  const handleUninstall = async (name: string): Promise<void> => {
    try {
      const result = await uninstallPackage(hostId, name);
      if (!result.success) {
        throw new Error(result.error || 'Failed to uninstall package');
      }
      await loadPackages();
    } catch (err) {
      console.error('Failed to uninstall package:', err);
    }
  };

  const handleUpdate = async (name: string): Promise<void> => {
    try {
      const result = await updatePackage(hostId, name);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update package');
      }
      await loadPackages();
    } catch (err) {
      console.error('Failed to update package:', err);
    }
  };

  const handleRefresh = async (): Promise<void> => {
    await loadPackages();
  };

  if (error) {
    return (
      <Typography color="error">
        Error loading packages: {error}
      </Typography>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <TextField
          fullWidth
          label="Search Packages"
          value={searchTerm}
          onChange={handleSearchChange}
          disabled={loading}
        />
        <IconButton
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshIcon />
        </IconButton>
      </Box>

      <Paper>
        <List>
          {loading ? (
            <ListItem>
              <CircularProgress />
            </ListItem>
          ) : packages?.length ? (
            packages.map((pkg) => (
              <ListItem key={pkg.name}>
                <ListItemText
                  primary={pkg.name}
                  secondary={`Version: ${pkg.version}${pkg.updateAvailable ? ' (Update available)' : ''}`}
                />
                <ListItemSecondaryAction>
                  {pkg.installed ? (
                    <>
                      {pkg.updateAvailable && (
                        <IconButton
                          edge="end"
                          onClick={(): Promise<void> => handleUpdate(pkg.name)}
                          title="Update package"
                        >
                          <UpdateIcon />
                        </IconButton>
                      )}
                      <IconButton
                        edge="end"
                        onClick={(): Promise<void> => handleUninstall(pkg.name)}
                        title="Uninstall package"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </>
                  ) : (
                    <IconButton
                      edge="end"
                      onClick={(): Promise<void> => handleInstall(pkg.name)}
                      title="Install package"
                    >
                      <GetAppIcon />
                    </IconButton>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
            ))
          ) : (
            <ListItem>
              <ListItemText primary="No packages found" />
            </ListItem>
          )}
        </List>
      </Paper>
    </Box>
  );
}
