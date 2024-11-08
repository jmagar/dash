import {
  Typography,
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import React from 'react';

import LoadingScreen from './LoadingScreen';
import { listInstalledPackages } from '../api/packageManager';
import { useAsync } from '../hooks/useAsync';
import type { Package } from '../types/models';

const PackageManager: React.FC = () => {
  const {
    data: packages,
    loading,
    error,
    execute: reloadPackages,
  } = useAsync<Package[]>(
    async () => {
      const response = await listInstalledPackages(1); // Assuming default hostId is 1
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to load packages');
      }
      return response.data;
    },
    { immediate: true },
  );

  if (loading) {
    return <LoadingScreen fullscreen={false} message="Loading packages..." />;
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
        <Button
          variant="contained"
          onClick={(): void => void reloadPackages()}
        >
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Installed Packages
      </Typography>
      <List>
        {packages?.map((pkg: Package) => (
          <ListItem key={pkg.name}>
            <ListItemText
              primary={pkg.name}
              secondary={pkg.version}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default PackageManager;
