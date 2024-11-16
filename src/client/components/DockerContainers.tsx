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

import { startContainer, stopContainer, restartContainer, removeContainer } from '../api';
import { useDockerUpdates } from '../hooks';
import LoadingScreen from './LoadingScreen';
import { logger } from '../utils/frontendLogger';

export default function DockerContainers(): JSX.Element {
  const theme = useTheme();
  const { containers, loading, error } = useDockerUpdates({ interval: 5000 });
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedContainer, setSelectedContainer] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleAction = async (
    containerId: string,
    action: 'start' | 'stop' | 'restart' | 'remove',
  ): Promise<void> => {
    try {
      setActionError(null);
      setActionLoading(prev => ({ ...prev, [containerId]: true }));

      logger.info(`${action}ing container`, { containerId, action });

      const actionMap = {
        start: startContainer,
        stop: stopContainer,
        restart: restartContainer,
        remove: removeContainer,
      };

      const result = await actionMap[action](containerId);
      if (!result.success) {
        throw new Error(result.error || `Failed to ${action} container`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to ${action} container`;
      logger.error(`Error ${action}ing container:`, { error: errorMessage, containerId });
      setActionError(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, [containerId]: false }));
      setShowDeleteDialog(false);
    }
  };

  const filteredContainers = useMemo(() => {
    return containers.filter(container =>
      container.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      container.image.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [containers, searchQuery]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running':
        return theme.palette.success.main;
      case 'stopped':
        return theme.palette.error.main;
      case 'restarting':
        return theme.palette.warning.main;
      default:
        return theme.palette.grey[500];
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading containers..." fullscreen={false} />;
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert
          severity="error"
          variant="filled"
          sx={{ borderRadius: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => window.location.reload()}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" alignItems="center" mb={3}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          Docker Containers
        </Typography>
        <Box display="flex" gap={1}>
          <TextField
            size="small"
            placeholder="Search containers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setSearchQuery('')}
                    edge="end"
                  >
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ width: 250 }}
          />
          <Tooltip title="Filter containers">
            <IconButton onClick={(e) => setFilterAnchorEl(e.currentTarget)}>
              <FilterIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {actionError && (
        <Alert
          severity="error"
          sx={{ mb: 2, borderRadius: 2 }}
          onClose={() => setActionError(null)}
        >
          {actionError}
        </Alert>
      )}

      <TableContainer
        component={Paper}
        elevation={3}
        sx={{
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <Table>
          <TableHead>
            <TableRow
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.08),
              }}
            >
              <TableCell>Name</TableCell>
              <TableCell>Image</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredContainers.map((container) => (
              <TableRow
                key={container.id}
                sx={{
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                  },
                }}
              >
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2" fontWeight="medium">
                      {container.name}
                    </Typography>
                    <Tooltip title="Container Info">
                      <IconButton size="small">
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {container.image}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={container.status}
                    size="small"
                    sx={{
                      bgcolor: alpha(getStatusColor(container.status), 0.1),
                      color: getStatusColor(container.status),
                      fontWeight: 'medium',
                    }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Box display="flex" justifyContent="flex-end" gap={1}>
                    <Tooltip title={container.state === 'running' ? 'Already running' : 'Start container'}>
                      <span>
                        <IconButton
                          onClick={() => void handleAction(container.id, 'start')}
                          disabled={container.state === 'running' || actionLoading[container.id]}
                          size="small"
                          sx={{
                            color: theme.palette.success.main,
                            '&:hover': {
                              bgcolor: alpha(theme.palette.success.main, 0.1),
                            },
                          }}
                        >
                          {actionLoading[container.id] ? (
                            <CircularProgress size={20} />
                          ) : (
                            <StartIcon />
                          )}
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title={container.state === 'stopped' ? 'Already stopped' : 'Stop container'}>
                      <span>
                        <IconButton
                          onClick={() => void handleAction(container.id, 'stop')}
                          disabled={container.state === 'stopped' || actionLoading[container.id]}
                          size="small"
                          sx={{
                            color: theme.palette.error.main,
                            '&:hover': {
                              bgcolor: alpha(theme.palette.error.main, 0.1),
                            },
                          }}
                        >
                          {actionLoading[container.id] ? (
                            <CircularProgress size={20} />
                          ) : (
                            <StopIcon />
                          )}
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title={container.state === 'stopped' ? 'Cannot restart stopped container' : 'Restart container'}>
                      <span>
                        <IconButton
                          onClick={() => void handleAction(container.id, 'restart')}
                          disabled={container.state === 'stopped' || actionLoading[container.id]}
                          size="small"
                          sx={{
                            color: theme.palette.warning.main,
                            '&:hover': {
                              bgcolor: alpha(theme.palette.warning.main, 0.1),
                            },
                          }}
                        >
                          {actionLoading[container.id] ? (
                            <CircularProgress size={20} />
                          ) : (
                            <RestartIcon />
                          )}
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Remove container">
                      <IconButton
                        onClick={() => {
                          setSelectedContainer(container.id);
                          setShowDeleteDialog(true);
                        }}
                        disabled={actionLoading[container.id]}
                        size="small"
                        sx={{
                          color: theme.palette.grey[600],
                          '&:hover': {
                            bgcolor: alpha(theme.palette.error.main, 0.1),
                            color: theme.palette.error.main,
                          },
                        }}
                      >
                        {actionLoading[container.id] ? (
                          <CircularProgress size={20} />
                        ) : (
                          <DeleteIcon />
                        )}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {filteredContainers.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    py={4}
                    color="text.secondary"
                  >
                    <Typography variant="body1" gutterBottom>
                      No containers found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {searchQuery
                        ? 'Try adjusting your search query'
                        : 'Start by creating a new container'}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu
        anchorEl={filterAnchorEl}
        open={Boolean(filterAnchorEl)}
        onClose={() => setFilterAnchorEl(null)}
        TransitionComponent={Fade}
      >
        <MenuItem>
          <ListItemIcon>
            <FilterIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Show all</ListItemText>
        </MenuItem>
        <MenuItem>
          <ListItemIcon>
            <StartIcon fontSize="small" color="success" />
          </ListItemIcon>
          <ListItemText>Running only</ListItemText>
        </MenuItem>
        <MenuItem>
          <ListItemIcon>
            <StopIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Stopped only</ListItemText>
        </MenuItem>
      </Menu>

      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        TransitionComponent={Fade}
        PaperProps={{
          elevation: 3,
          sx: { borderRadius: 2 },
        }}
      >
        <DialogTitle>Confirm Container Removal</DialogTitle>
        <DialogContent>
          Are you sure you want to remove this container? This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
          <Button
            onClick={() => selectedContainer && void handleAction(selectedContainer, 'remove')}
            color="error"
            variant="contained"
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
