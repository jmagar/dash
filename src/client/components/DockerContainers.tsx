import {
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Refresh as RestartIcon,
  Delete as DeleteIcon,
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
} from '@mui/material';
import React, { useState } from 'react';

import { startContainer, stopContainer, restartContainer, removeContainer } from '../api';
import { useDockerUpdates } from '../hooks';
import LoadingScreen from './LoadingScreen';
import { logger } from '../utils/frontendLogger';

export default function DockerContainers(): JSX.Element {
  const { containers, loading, error } = useDockerUpdates({ interval: 5000 });
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});

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
        const errorMessage = result.error || `Failed to ${action} container`;
        logger.error(`Failed to ${action} container:`, { error: errorMessage, containerId });
        setActionError(errorMessage);
      } else {
        logger.info(`Container ${action}ed successfully`, { containerId });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to ${action} container`;
      logger.error(`Error ${action}ing container:`, { error: errorMessage, containerId });
      setActionError(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, [containerId]: false }));
    }
  };

  if (loading) {
    return <LoadingScreen fullscreen={false} message="Loading containers..." />;
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Docker Containers
      </Typography>

      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={(): void => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Image</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {containers.map((container) => (
              <TableRow key={container.id}>
                <TableCell>{container.name}</TableCell>
                <TableCell>{container.image}</TableCell>
                <TableCell>{container.status}</TableCell>
                <TableCell>
                  <Tooltip title={container.state === 'running' ? 'Already running' : 'Start container'}>
                    <span>
                      <IconButton
                        onClick={(): void => void handleAction(container.id, 'start')}
                        disabled={container.state === 'running' || actionLoading[container.id]}
                      >
                        <StartIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={container.state === 'stopped' ? 'Already stopped' : 'Stop container'}>
                    <span>
                      <IconButton
                        onClick={(): void => void handleAction(container.id, 'stop')}
                        disabled={container.state === 'stopped' || actionLoading[container.id]}
                      >
                        <StopIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={container.state === 'stopped' ? 'Cannot restart stopped container' : 'Restart container'}>
                    <span>
                      <IconButton
                        onClick={(): void => void handleAction(container.id, 'restart')}
                        disabled={container.state === 'stopped' || actionLoading[container.id]}
                      >
                        <RestartIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Remove container">
                    <IconButton
                      onClick={(): void => void handleAction(container.id, 'remove')}
                      disabled={actionLoading[container.id]}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {containers.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography color="textSecondary">No containers found</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
