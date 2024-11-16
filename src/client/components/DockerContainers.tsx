import {
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Refresh as RestartIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Info as InfoIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  Fade,
  CircularProgress,
  Chip,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  alpha,
} from '@mui/material';
import React, { useState, useMemo } from 'react';

import { Container } from '../../types/models-shared';
import { startContainer, stopContainer, restartContainer, removeContainer } from '../api/docker.client';
import { useDockerUpdates } from '../hooks';
import LoadingScreen from './LoadingScreen';
import { logger } from '../utils/frontendLogger';

interface DockerContainersProps {
  hostId: string;
  onRefresh?: () => void;
}

export function DockerContainers({ hostId, onRefresh }: DockerContainersProps) {
  const theme = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { containers, loading, error, refresh } = useDockerUpdates({
    hostId,
    interval: 5000,
  });

  // Filter containers based on search term
  const filteredContainers = useMemo(() => {
    if (!searchTerm) return containers;
    const term = searchTerm.toLowerCase();
    return containers.filter(container =>
      container.name.toLowerCase().includes(term) ||
      container.image.toLowerCase().includes(term) ||
      container.id.substring(0, 12).includes(term)
    );
  }, [containers, searchTerm]);

  const handleStartContainer = async (containerId: string) => {
    try {
      setActionInProgress(containerId);
      setActionError(null);
      await startContainer(hostId, containerId);
      await refresh();
      onRefresh?.();
    } catch (error) {
      logger.error('Failed to start container:', {
        error: error instanceof Error ? error.message : String(error),
        containerId,
      });
      setActionError('Failed to start container');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleStopContainer = async (containerId: string) => {
    try {
      setActionInProgress(containerId);
      setActionError(null);
      await stopContainer(hostId, containerId);
      await refresh();
      onRefresh?.();
    } catch (error) {
      logger.error('Failed to stop container:', {
        error: error instanceof Error ? error.message : String(error),
        containerId,
      });
      setActionError('Failed to stop container');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRestartContainer = async (containerId: string) => {
    try {
      setActionInProgress(containerId);
      setActionError(null);
      await restartContainer(hostId, containerId);
      await refresh();
      onRefresh?.();
    } catch (error) {
      logger.error('Failed to restart container:', {
        error: error instanceof Error ? error.message : String(error),
        containerId,
      });
      setActionError('Failed to restart container');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRemoveContainer = async (containerId: string) => {
    try {
      setActionInProgress(containerId);
      setActionError(null);
      await removeContainer(hostId, containerId);
      await refresh();
      onRefresh?.();
      setShowDeleteDialog(false);
      setSelectedContainer(null);
    } catch (error) {
      logger.error('Failed to remove container:', {
        error: error instanceof Error ? error.message : String(error),
        containerId,
      });
      setActionError('Failed to remove container');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleFilterClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
  };

  if (loading && containers.length === 0) {
    return <LoadingScreen />;
  }

  return (
    <Box sx={{ width: '100%', mb: 2 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {actionError}
        </Alert>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
        <TextField
          size="small"
          placeholder="Search containers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchTerm('')}>
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ flexGrow: 1 }}
        />

        <IconButton onClick={handleFilterClick}>
          <FilterIcon />
        </IconButton>

        <Menu
          anchorEl={filterAnchorEl}
          open={Boolean(filterAnchorEl)}
          onClose={handleFilterClose}
        >
          <MenuItem>
            <ListItemIcon>
              <PlayArrow />
            </ListItemIcon>
            <ListItemText primary="Running" />
          </MenuItem>
          <MenuItem>
            <ListItemIcon>
              <Stop />
            </ListItemIcon>
            <ListItemText primary="Stopped" />
          </MenuItem>
        </Menu>

        <IconButton onClick={() => refresh()}>
          <RestartIcon />
        </IconButton>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Image</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredContainers.map((container) => (
              <TableRow
                key={container.id}
                sx={{
                  '&:last-child td, &:last-child th': { border: 0 },
                  backgroundColor:
                    actionInProgress === container.id
                      ? alpha(theme.palette.primary.main, 0.1)
                      : 'inherit',
                }}
              >
                <TableCell component="th" scope="row">
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    {container.name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {container.id.substring(0, 12)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{container.image}</Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={container.status}
                    color={container.state === 'running' ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(container.created * 1000).toLocaleString()}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    {container.state === 'running' ? (
                      <Tooltip title="Stop">
                        <IconButton
                          size="small"
                          onClick={() => handleStopContainer(container.id)}
                          disabled={Boolean(actionInProgress)}
                        >
                          <StopIcon />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Start">
                        <IconButton
                          size="small"
                          onClick={() => handleStartContainer(container.id)}
                          disabled={Boolean(actionInProgress)}
                        >
                          <StartIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Restart">
                      <IconButton
                        size="small"
                        onClick={() => handleRestartContainer(container.id)}
                        disabled={Boolean(actionInProgress)}
                      >
                        <RestartIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedContainer(container);
                          setShowDeleteDialog(true);
                        }}
                        disabled={Boolean(actionInProgress)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Settings">
                      <IconButton size="small">
                        <SettingsIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Info">
                      <IconButton size="small">
                        <InfoIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Container</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete container{' '}
            <strong>{selectedContainer?.name}</strong>?
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
          <Button
            onClick={() => selectedContainer && handleRemoveContainer(selectedContainer.id)}
            color="error"
            variant="contained"
            disabled={Boolean(actionInProgress)}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
