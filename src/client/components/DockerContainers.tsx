import {
  PlayArrow as PlayArrowIcon,
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

import type { DockerContainer, DockerPort } from '../../types/docker';
import { startContainer, stopContainer, restartContainer, removeContainer } from '../api/docker.client';
import { useDockerUpdates } from '../hooks';
import LoadingScreen from './LoadingScreen';
import { logger } from '../utils/frontendLogger';

interface DockerContainersProps {
  hostId: string;
  containers: DockerContainer[];
  onRefresh: () => Promise<void>;
}

export function DockerContainers({ hostId, containers, onRefresh }: DockerContainersProps) {
  const theme = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedContainer, setSelectedContainer] = useState<DockerContainer | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const filteredContainers = useMemo(() => {
    if (!containers) return [];
    return containers.filter(container => {
      const searchString = searchTerm.toLowerCase();
      return (
        container.name.toLowerCase().includes(searchString) ||
        container.image.toLowerCase().includes(searchString) ||
        container.status.toLowerCase().includes(searchString)
      );
    });
  }, [containers, searchTerm]);

  const handleFilterClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const handleContainerAction = async (
    container: DockerContainer,
    action: 'start' | 'stop' | 'restart' | 'remove'
  ) => {
    setLoading(true);
    try {
      switch (action) {
        case 'start':
          await startContainer(hostId, container.id);
          break;
        case 'stop':
          await stopContainer(hostId, container.id);
          break;
        case 'restart':
          await restartContainer(hostId, container.id);
          break;
        case 'remove':
          setSelectedContainer(container);
          setShowDeleteDialog(true);
          break;
      }
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      logger.error('Failed to perform container action:', {
        action,
        containerId: container.id,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedContainer) return;

    setLoading(true);
    try {
      await removeContainer(hostId, selectedContainer.id);
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      logger.error('Failed to remove container:', {
        containerId: selectedContainer.id,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(false);
      setShowDeleteDialog(false);
      setSelectedContainer(null);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <TextField
          size="small"
          placeholder="Search containers..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={handleClearSearch}>
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
              <PlayArrowIcon />
            </ListItemIcon>
            <ListItemText primary="Running" />
          </MenuItem>
          <MenuItem>
            <ListItemIcon>
              <StopIcon />
            </ListItemIcon>
            <ListItemText primary="Stopped" />
          </MenuItem>
        </Menu>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Image</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Ports</TableCell>
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
                    container.state === 'running'
                      ? alpha(theme.palette.success.main, 0.1)
                      : undefined,
                }}
              >
                <TableCell component="th" scope="row">
                  {container.name}
                </TableCell>
                <TableCell>{container.image}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={container.status}
                    color={container.state === 'running' ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell>
                  {new Date(container.created * 1000).toLocaleString()}
                </TableCell>
                <TableCell>
                  {container.ports.map((port: DockerPort) => (
                    <Chip
                      key={`${port.privatePort}-${port.publicPort}`}
                      size="small"
                      label={`${port.publicPort}:${port.privatePort}`}
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  ))}
                </TableCell>
                <TableCell align="right">
                  {container.state !== 'running' ? (
                    <Tooltip title="Start">
                      <IconButton
                        size="small"
                        onClick={() => handleContainerAction(container, 'start')}
                        disabled={loading}
                      >
                        <PlayArrowIcon />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip title="Stop">
                      <IconButton
                        size="small"
                        onClick={() => handleContainerAction(container, 'stop')}
                        disabled={loading}
                      >
                        <StopIcon />
                      </IconButton>
                    </Tooltip>
                  )}

                  <Tooltip title="Restart">
                    <IconButton
                      size="small"
                      onClick={() => handleContainerAction(container, 'restart')}
                      disabled={loading}
                    >
                      <RestartIcon />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Remove">
                    <IconButton
                      size="small"
                      onClick={() => handleContainerAction(container, 'remove')}
                      disabled={loading}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Settings">
                    <IconButton size="small" disabled={loading}>
                      <SettingsIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove container{' '}
            <strong>{selectedContainer?.name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {loading && (
        <Fade in>
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 9999,
            }}
          >
            <CircularProgress />
          </Box>
        </Fade>
      )}
    </Box>
  );
}
