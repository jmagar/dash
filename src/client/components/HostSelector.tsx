import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material';
import { listHosts } from '../api/hosts.client';
import type { Host } from '../../types/models-shared';
import { logger } from '../utils/frontendLogger';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (host: Host) => void;
}

export default function HostSelector({ open, onClose, onSelect }: Props) {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listHosts();
      setHosts(data);
    } catch (error) {
      logger.error('Failed to load hosts:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      setError('Failed to load hosts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void loadHosts();
    }
  }, [open, loadHosts]);

  const handleSelect = () => {
    if (selectedHost) {
      onSelect(selectedHost);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Select Host</DialogTitle>
      <DialogContent>
        {error && (
          <Typography color="error" mb={2}>
            {error}
          </Typography>
        )}
        {loading ? (
          <Typography>Loading...</Typography>
        ) : (
          <List>
            {hosts.map((host) => (
              <ListItem key={host.id} disablePadding>
                <ListItemButton
                  selected={selectedHost?.id === host.id}
                  onClick={() => setSelectedHost(host)}
                >
                  <ListItemText
                    primary={host.name}
                    secondary={`${host.hostname}:${host.port}`}
                  />
                </ListItemButton>
              </ListItem>
            ))}
            {hosts.length === 0 && (
              <Typography variant="body2" color="textSecondary" align="center">
                No hosts found
              </Typography>
            )}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSelect} disabled={!selectedHost}>
          Select
        </Button>
      </DialogActions>
    </Dialog>
  );
}
