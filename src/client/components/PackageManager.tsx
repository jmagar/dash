import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import { Add, Delete, Refresh, Update } from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import {
  listPackages,
  installPackage,
  uninstallPackage,
  updatePackage,
  searchPackages,
} from '../api/packageManager.client';
import type { Package } from '../../types/models-shared';
import { logger } from '../utils/frontendLogger';

export function PackageManager() {
  const { hostId } = useParams<{ hostId: string }>();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [packageName, setPackageName] = useState('');

  const loadPackages = useCallback(async () => {
    if (!hostId) {
      setError('No host ID provided');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await listPackages(hostId);
      setPackages(data);
    } catch (error) {
      logger.error('Failed to load packages:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
      });
      setError('Failed to load packages');
    } finally {
      setLoading(false);
    }
  }, [hostId]);

  const handleInstall = useCallback(async () => {
    if (!hostId || !packageName.trim()) return;

    try {
      setLoading(true);
      setError(null);
      await installPackage(hostId, packageName);
      await loadPackages();
      setPackageName('');
    } catch (error) {
      logger.error('Failed to install package:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
        packageName,
      });
      setError('Failed to install package');
    } finally {
      setLoading(false);
    }
  }, [hostId, packageName, loadPackages]);

  const handleUninstall = useCallback(async (name: string) => {
    if (!hostId) return;

    try {
      setLoading(true);
      setError(null);
      await uninstallPackage(hostId, name);
      await loadPackages();
    } catch (error) {
      logger.error('Failed to uninstall package:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
        packageName: name,
      });
      setError('Failed to uninstall package');
    } finally {
      setLoading(false);
    }
  }, [hostId, loadPackages]);

  const handleUpdate = useCallback(async (name: string) => {
    if (!hostId) return;

    try {
      setLoading(true);
      setError(null);
      await updatePackage(hostId, name);
      await loadPackages();
    } catch (error) {
      logger.error('Failed to update package:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
        packageName: name,
      });
      setError('Failed to update package');
    } finally {
      setLoading(false);
    }
  }, [hostId, loadPackages]);

  const handleSearch = useCallback(async () => {
    if (!hostId || !searchQuery.trim()) {
      void loadPackages();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await searchPackages(hostId, searchQuery);
      setPackages(data);
    } catch (error) {
      logger.error('Failed to search packages:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
        query: searchQuery,
      });
      setError('Failed to search packages');
    } finally {
      setLoading(false);
    }
  }, [hostId, searchQuery, loadPackages]);

  useEffect(() => {
    void loadPackages();
  }, [loadPackages]);

  if (!hostId) {
    return <Typography color="error">No host ID provided</Typography>;
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" mb={2}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          Package Manager
        </Typography>
        <IconButton onClick={() => void loadPackages()}>
          <Refresh />
        </IconButton>
      </Box>

      {error && (
        <Typography color="error" mb={2}>
          {error}
        </Typography>
      )}

      <Box display="flex" gap={2} mb={2}>
        <TextField
          label="Search packages"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && void handleSearch()}
          fullWidth
        />
        <Button variant="contained" onClick={() => void handleSearch()}>
          Search
        </Button>
      </Box>

      <Box display="flex" gap={2} mb={2}>
        <TextField
          label="Package name"
          value={packageName}
          onChange={(e) => setPackageName(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && void handleInstall()}
          fullWidth
        />
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => void handleInstall()}
          disabled={!packageName.trim()}
        >
          Install
        </Button>
      </Box>

      {loading ? (
        <Typography>Loading...</Typography>
      ) : (
        <List>
          {packages.map((pkg) => (
            <ListItem
              key={pkg.name}
              secondaryAction={
                <Box>
                  <IconButton onClick={() => void handleUpdate(pkg.name)}>
                    <Update />
                  </IconButton>
                  <IconButton onClick={() => void handleUninstall(pkg.name)}>
                    <Delete />
                  </IconButton>
                </Box>
              }
            >
              <ListItemText
                primary={pkg.name}
                secondary={`Version: ${pkg.version}`}
              />
            </ListItem>
          ))}
          {packages.length === 0 && (
            <Typography variant="body2" color="textSecondary" align="center">
              No packages found
            </Typography>
          )}
        </List>
      )}
    </Box>
  );
}
