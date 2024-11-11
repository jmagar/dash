import {
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Refresh as RestartIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import {
  Box,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import React, { useState } from 'react';

import { startContainer, stopContainer, restartContainer, removeContainer } from '../api';
import { useDockerUpdates } from '../hooks';
import LoadingScreen from './LoadingScreen';

export default function DockerContainers(): JSX.Element {
  const { containers, loading, error } = useDockerUpdates({ interval: 5000 });
  const [actionError, setActionError] = useState<string | null>(null);

  const handleAction = async (
    containerId: string,
    action: 'start' | 'stop' | 'restart' | 'remove',
  ): Promise<void> => {
    try {
      setActionError(null);
      const actionMap = {
        start: startContainer,
        stop: stopContainer,
        restart: restartContainer,
        remove: removeContainer,
      };

      const result = await actionMap[action](containerId);
      if (!result.success) {
        setActionError(result.error || `Failed to ${action} container`);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : `Failed to ${action} container`);
    }
  };

  if (loading) {
    return <LoadingScreen fullscreen={false} message="Loading containers..." />;
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Docker Containers
      </Typography>

      {actionError && (
        <Typography color="error" sx={{ mb: 2 }}>
          {actionError}
        </Typography>
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
                  <IconButton
                    onClick={(): void => void handleAction(container.id, 'start')}
                    disabled={container.state === 'running'}
                  >
                    <StartIcon />
                  </IconButton>
                  <IconButton
                    onClick={(): void => void handleAction(container.id, 'stop')}
                    disabled={container.state === 'stopped'}
                  >
                    <StopIcon />
                  </IconButton>
                  <IconButton
                    onClick={(): void => void handleAction(container.id, 'restart')}
                    disabled={container.state === 'stopped'}
                  >
                    <RestartIcon />
                  </IconButton>
                  <IconButton
                    onClick={(): void => void handleAction(container.id, 'remove')}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
