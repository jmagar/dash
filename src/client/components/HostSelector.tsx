import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Typography,
  CircularProgress,
  Alert,
  Box,
  Divider,
  TextField,
  InputAdornment,
  IconButton,
  useTheme,
  Fade,
} from '@mui/material';
import {
  Computer as ComputerIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { listHosts } from '../api/hosts.client';
import type { Host } from '../../types/models-shared';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (host: Host) => void;
  onAdd?: () => void;
}

export function HostSelector({ open, onClose, onSelect, onAdd }: Props): JSX.Element {
  const theme = useTheme();
  const [hosts, setHosts] = useState<Host[]>([]);
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const loadHosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listHosts();
      setHosts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load hosts');
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

  const filteredHosts = hosts.filter(
    (host) =>
      host.name.toLowerCase().includes(filter.toLowerCase()) ||
      host.hostname.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionComponent={Fade}
      PaperProps={{
        elevation: 3,
        sx: {
          borderRadius: 2,
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle
        sx={{
          bgcolor: 'background.paper',
          borderBottom: `1px solid ${theme.palette.divider}`,
          p: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ComputerIcon color="primary" />
          <Typography variant="h6">Select Host</Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          fullWidth
          placeholder="Search hosts..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          variant="outlined"
          size="small"
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: filter && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => setFilter('')}
                  edge="end"
                >
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        {loading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              py: 4,
            }}
          >
            <CircularProgress size={32} thickness={4} />
          </Box>
        ) : (
          <>
            <List sx={{ minHeight: 200, maxHeight: 400, overflow: 'auto' }}>
              {filteredHosts.map((host) => (
                <ListItem key={host.id} disablePadding>
                  <ListItemButton
                    selected={selectedHost?.id === host.id}
                    onClick={() => setSelectedHost(host)}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      '&.Mui-selected': {
                        backgroundColor: theme.palette.action.selected,
                        '&:hover': {
                          backgroundColor: theme.palette.action.selected,
                        },
                      },
                    }}
                  >
                    <ListItemIcon>
                      <ComputerIcon
                        color={selectedHost?.id === host.id ? 'primary' : 'action'}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={host.name}
                      secondary={`${host.hostname}:${host.port}`}
                      primaryTypographyProps={{
                        variant: 'subtitle2',
                        fontWeight: selectedHost?.id === host.id ? 'bold' : 'normal',
                      }}
                      secondaryTypographyProps={{
                        variant: 'caption',
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
              {filteredHosts.length === 0 && (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 4,
                    color: 'text.secondary',
                  }}
                >
                  <Typography variant="body2" gutterBottom>
                    No hosts found
                  </Typography>
                  {onAdd && (
                    <Button
                      startIcon={<AddIcon />}
                      onClick={onAdd}
                      size="small"
                      sx={{ mt: 1 }}
                    >
                      Add New Host
                    </Button>
                  )}
                </Box>
              )}
            </List>
          </>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          size="large"
          sx={{
            borderRadius: 1,
            textTransform: 'none',
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSelect}
          disabled={!selectedHost}
          variant="contained"
          size="large"
          sx={{
            borderRadius: 1,
            textTransform: 'none',
            minWidth: 100,
          }}
        >
          Select
        </Button>
      </DialogActions>
    </Dialog>
  );
}
