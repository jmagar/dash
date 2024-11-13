import {
  Refresh as RefreshIcon,
  Search as SearchIcon,
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
  IconButton,
} from '@mui/material';
import React, { useState } from 'react';

import type { Package } from '../../types';
import {
  listInstalledPackages,
  installPackage,
  uninstallPackage,
  updatePackage,
  searchPackages,
} from '../api';
import { useAsync } from '../hooks';
import LoadingScreen from './LoadingScreen';

interface Props {
  hostId: number;
}

export default function PackageManager({ hostId }: Props): JSX.Element {
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Package[] | null>(null);

  const loadPackages = async (): Promise<Package[]> => {
    const result = await listInstalledPackages(hostId);
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to load packages');
    }
    return result.data;
  };

  const {
    data: packages,
    loading,
    error: loadError,
    execute: refreshPackages,
  } = useAsync<Package[]>(loadPackages, { immediate: true });

  const handleSearch = async (): Promise<void> => {
    if (!searchTerm.trim()) return;
    setError(null);
    setSearchResults(null);

    try {
      const result = await searchPackages(hostId, searchTerm);
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Search failed');
      }
      setSearchResults(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    }
  };

  const handleInstall = async (pkg: Package): Promise<void> => {
    setError(null);
    try {
      const result = await installPackage(hostId, pkg.name);
      if (!result.success) {
        throw new Error(result.error || 'Installation failed');
      }
      void refreshPackages();
      setSearchResults(null); // Clear search results after successful install
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Installation failed');
    }
  };

  const handleUninstall = async (pkg: Package): Promise<void> => {
    setError(null);
    try {
      const result = await uninstallPackage(hostId, pkg.name);
      if (!result.success) {
        throw new Error(result.error || 'Uninstallation failed');
      }
      void refreshPackages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Uninstallation failed');
    }
  };

  const handleUpdate = async (pkg: Package): Promise<void> => {
    setError(null);
    try {
      const result = await updatePackage(hostId, pkg.name);
      if (!result.success) {
        throw new Error(result.error || 'Update failed');
      }
      void refreshPackages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  if (loading) {
    return <LoadingScreen fullscreen={false} message="Loading packages..." />;
  }

  const displayPackages = searchResults ?? packages ?? [];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h5">Package Manager</Typography>
        <IconButton onClick={(): void => void refreshPackages()}>
          <RefreshIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            placeholder="Search packages..."
            value={searchTerm}
            onChange={(e): void => setSearchTerm(e.target.value)}
            fullWidth
          />
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={(): void => void handleSearch()}
            disabled={!searchTerm.trim()}
          >
            Search
          </Button>
        </Box>
      </Box>

      {(error || loadError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || loadError}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Version</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayPackages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography color="textSecondary">
                    {searchResults ? 'No packages found' : 'No packages installed'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              displayPackages.map((pkg) => (
                <TableRow key={pkg.name}>
                  <TableCell>{pkg.name}</TableCell>
                  <TableCell>{pkg.version}</TableCell>
                  <TableCell>{pkg.description}</TableCell>
                  <TableCell align="right">
                    {pkg.installed ? (
                      <>
                        <Button
                          size="small"
                          onClick={(): void => void handleUninstall(pkg)}
                        >
                          Uninstall
                        </Button>
                        {pkg.updateAvailable && (
                          <Button
                            size="small"
                            color="primary"
                            onClick={(): void => void handleUpdate(pkg)}
                          >
                            Update
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button
                        size="small"
                        color="primary"
                        onClick={(): void => void handleInstall(pkg)}
                      >
                        Install
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
