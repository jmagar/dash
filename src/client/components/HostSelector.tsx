import { Check as CheckIcon } from '@mui/icons-material';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  CircularProgress,
} from '@mui/material';
import React, { useState, useEffect, useCallback } from 'react';

import type { Host } from '../../types';
import { listHosts } from '../api/hosts.client';
import { useAsync } from '../hooks';
import { logger } from '../utils/frontendLogger';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (hosts: Host[]) => void;
  multiSelect?: boolean;
  selectedHosts?: Host[];
}

export default function HostSelector({
  open,
  onClose,
  onSelect,
  multiSelect = false,
  selectedHosts = [],
}: Props): JSX.Element {
  const [selected, setSelected] = useState<Host[]>(selectedHosts);

  const loadHostsList = useCallback(async (): Promise<Host[]> => {
    logger.info('Loading hosts list');
    const result = await listHosts();
    if (!result.success) {
      const error = result.error || 'Failed to load hosts';
      logger.error('Failed to load hosts', { error });
      throw new Error(error);
    }
    logger.info('Hosts loaded successfully', { count: result.data?.length });
    return result.data || [];
  }, []);

  const {
    data: hosts,
    loading,
    error,
    execute: loadHosts,
  } = useAsync(loadHostsList, { immediate: false });

  useEffect(() => {
    if (open) {
      logger.info('Host selector opened, loading hosts');
      void loadHosts();
    }
  }, [open, loadHosts]);

  const handleSelect = useCallback((host: Host): void => {
    logger.info('Host selected', { hostId: host.id });
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
  }, [multiSelect, selected, onSelect, onClose]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Select Host{multiSelect ? 's' : ''}</DialogTitle>
      <DialogContent>
        {loading && <CircularProgress />}
        {error && (
          <Typography color="error" gutterBottom>
            {error}
          </Typography>
        )}
        {hosts && (
          <List>
            {hosts.map((host: Host) => {
              const isSelected = selected.some((h) => h.id === host.id);
              return (
                <ListItem
                  key={host.id}
                  button
                  onClick={(): void => handleSelect(host)}
                  selected={isSelected}
                >
                  <ListItemText
                    primary={host.name}
                    secondary={`${host.hostname}:${host.port}`}
                  />
                  {isSelected && (
                    <ListItemSecondaryAction>
                      <IconButton edge="end">
                        <CheckIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  )}
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}
